import _ from 'underscore';
import Rx from 'rxjs';

import games from '../games';
import makeWsDriver, { CLOSE, ERROR, INCOMING, OUTGOING }  from './sockets';
import { createShortRandomHash } from '../hash';

const DB_SAVEGAME = 'savegame';
export const UPDATE_TURN = 'update_turn';
export const DISCONNECT = 'disconnect';

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

  const botNames = _.pluck(props.sockets, 'name');

  // Perhaps move the logging into the game itself? Nah.
  const logGameStart$ = Rx.Observable.of(
    `${gameId}: ` +
    `A game of ${gameType} has started. ` +
    `Bots: ${botNames.join(', ')}.`
  );

  const botUpdate$ = Rx.Observable.from(props.sockets)
    .flatMap(({ socketId, name }) =>
      sources.ws
        .filter(({ socketId: id }) => (socketId === id))
        .map((update) => {
          if (update.type === INCOMING) {
            return {
              ...update.payload,
              name,
              time: Date.now(),
              type: UPDATE_TURN,
            };
          }
          if (update.type === CLOSE || update.type === ERROR) {
            return { name, type: DISCONNECT };
          }
        })
    );

  // TODO
  // - Check that the database-saved games don't look screwed-up.
  // - Consider refactoring the way that turns are stored: accumulate as the
  // game goes-along, rather than in some unnecessary extra stream logic at
  // the end.
  // - Perhaps clean up the whole scan-reducer pattern - there seems to be too
  // - many unnecessary transformations between turns/updates/turn-and-state
  // events, etc.

  const sideEffect$ = new Rx.Subject();

  const update$ = botUpdate$
    .merge(sideEffect$)
    .startWith({
      state: games[gameType].createInitialState(botNames),
      out: botNames,
    })
    .scan(games[gameType].reducer)
    .shareReplay()
    .let(takeWhileInclusive(({ state: { result } }) => !result));

  update$
    .let(games[gameType].sideEffects)
    .subscribe(sideEffect$);

  const wsUpdate$ = Rx.Observable.from(props.sockets)
    .flatMap(({ name, socketId }) => update$
      .filter(({ out }) => out.includes(name))
      .map(payload => (
        { type: OUTGOING, socketId, payload: _.pick(payload, 'state', 'turn') }
      ))
    );

  const wsClose$ = update$
    .ignoreElements()
    .delay(10)
    .concat(
      Rx.Observable.from(props.sockets)
        .map(({ socketId }) => ({ type: CLOSE, socketId }))
    );

  const dbUpdate$ = update$
    .last()
    .map(({ state }) => games[gameType].getDbRecord(
      { state, gameId, startTime, contest }
    ))
    .map(gameRecord => ({
      type: DB_SAVEGAME,
      id: gameRecord._id,
      gen: db => db.collection('games').insertOne(gameRecord),
    }));

  const logDbSuccess$ = sources.db
    .first(({ request: { type, id } }) => (
      type === DB_SAVEGAME && gameId === id
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
    const { gameId, bots, result: { victor, reason } } = state;
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