import _ from 'underscore';
import Rx from 'rxjs';

import games from 'battlebots/games';
import { createShortRandomHash } from 'battlebots/hash';
import { SOCKET_OUTGOING, SOCKET_CLOSE } from 'battlebots/const';

import makeWsDriver from './sockets';

const GAME_DB_SAVE = 'GAME_DB_SAVE';

function takeWhileInclusive(predicate) {
  // Returns the stream until the predicate becomes false, and also return the
  // first false result.
  return src$ => src$
    .takeWhile(predicate)
    .concat(src$.first(x => !predicate(x)));
}

export default function Game(sources) {
  const props = sources.props;

  const gameId = createShortRandomHash();
  const { gameType, contest } = props;
  const startTime = new Date();
  const game = games[gameType];

  const botNames = _.pluck(props.sockets, 'name');

  const logGameStart$ = Rx.Observable.of(
    `${gameId}: ` +
    `A game of ${gameType} has started. ` +
    `Bots: ${botNames.join(', ')}.`
  );

  const botUpdate$ = Rx.Observable.from(props.sockets)
    .flatMap(({ socketId, name }) =>
      sources.ws
        .filter(({ socketId: id }) => (socketId === id))
        .map(({ type, payload = {} }) => (
          { ...payload, type, name, time: Date.now() }
        ))
    )
    .share();

  const sideEffect$ = new Rx.Subject();

  const update$ = botUpdate$
    .merge(sideEffect$)
    .startWith(game.createInitialUpdate(botNames))
    .scan(game.reducer)
    .shareReplay()
    .let(takeWhileInclusive(({ state: { result } }) => !result));

  update$
    .let(game.sideEffects)
    .subscribe(sideEffect$);

  const wsUpdate$ = Rx.Observable.from(props.sockets)
    .flatMap(({ name, socketId }) => update$
      .filter(({ outgoing }) => outgoing[name])
      .map(({ outgoing: { [name]: payload }}) => (
        { type: SOCKET_OUTGOING, socketId, payload }
      ))
    );

  const wsClose$ = update$
    .ignoreElements()
    .delay(10)
    .concat(
      Rx.Observable.from(props.sockets)
        .map(({ socketId }) => ({ type: SOCKET_CLOSE, socketId }))
    );

  const dbUpdate$ = update$
    .last()
    .map(({ state }) => game.getDbRecord(
      { state, gameId, startTime, contest }
    ))
    .map(gameRecord => ({
      type: GAME_DB_SAVE,
      id: gameRecord._id,
      gen: db => db.collection('games').insertOne(gameRecord),
    }));

  const logDbSuccess$ = sources.db
    .first(({ request: { type, id } }) => (
      type === GAME_DB_SAVE && gameId === id
    ))
    .flatMap(response$ => response$
      .ignoreElements()
      .concat(Rx.Observable.of(`${response$.request.id}: Game saved to database`))
      .catch((err) => {
        return Rx.Observable.from([
          `${response$.request.id}: Could not save game to database`,
          `${response$.request.id}: ${err.message}`,
        ])
      })
    );

  const logGameEnd$ = update$.last().map(({ state }) => {
    const { bots, result: { victor, reason } } = state;
    const text = victor ?
      `${victor} has won a game of ${gameType}` :
      `A ${gameType} game has ended in a draw`;
    return `${gameId}: ${text}. Bots: ${botNames.join(', ')} (Reason: ${reason})`;
  });

  return {
    complete: Rx.Observable.merge(
      wsClose$,
      logDbSuccess$,
    )
    .ignoreElements(),

    ws: Rx.Observable.merge(wsUpdate$, wsClose$),

    db: dbUpdate$,

    log: Rx.Observable.merge(
      logGameStart$,
      logGameEnd$,
      logDbSuccess$,
    ),
  };
}
