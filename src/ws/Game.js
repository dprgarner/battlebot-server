import _ from 'underscore';
import Rx from 'rxjs';

import Victor from './Victor';
import games from '../games';
import makeWsDriver, { CLOSE, INCOMING, OUTGOING }  from './sockets';
import { createShortRandomHash } from '../hash';

const DB_SAVEGAME = 'savegame';

function takeWhileInclusive(predicate) {
  // Returns the stream until the predicate becomes false, and the first false
  // result.
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

  const logGameStart$ = Rx.Observable.of(
    `${gameId}: ` +
    `A game of ${gameType} has started. ` +
    `Bots: ${botNames.join(', ')}.`
  );

  const incoming$ = Rx.Observable.from(props.sockets)
    .flatMap(({ socketId, name }) =>
      sources.ws.filter(({ type, socketId: id }) => (
        type === INCOMING && socketId === id
      ))
      .map(({ payload }) => (
        {...payload, name, time: Date.now() }
      ))
    );

  const game = incoming$
    .startWith({
      state: games[gameType].createInitialState(botNames),
      out: botNames,
    })
    .scan(games[gameType].reducer)
    .shareReplay();

  // TODO fix timeouts and invalid move botches
  const update$ = game
    .let(takeWhileInclusive(({ state: { result } }) => !result));

  // const updateWithoutConclusion$ = game
  //   .map(({ state, turn, out }) => ({ state, turn, out }));
  // const victor$ = Victor({ props, ws: sources.ws, update: updateWithoutConclusion$ }).victor;

  // const update$ = updateWithoutConclusion$
  //   .takeUntil(victor$)
  //   .concat(
  //     victor$
  //     .withLatestFrom(updateWithoutConclusion$, (result, finalUpdate) => {
  //       if (finalUpdate.state.result) return;
  //       return {
  //         state: { ...finalUpdate.state, result },
  //         out: botNames,
  //       };
  //     })
  //     .filter(x => x)
  //   );

  const wsUpdate$ = Rx.Observable.from(props.sockets)
    .flatMap(({ name, socketId }) => update$
      .filter(({ out }) => out.includes(name))
      .map(payload => (
        { type: OUTGOING, socketId, payload: _.pick(payload, 'state', 'turn') }
      ))
    );

  const wsClose$ = update$.ignoreElements()
    .delay(10)
    .concat(
      Rx.Observable.from(props.sockets)
        .map(({ socketId }) => ({ type: CLOSE, socketId }))
    );

  const dbUpdate$ = games[gameType].dbRecord(
    { update$, gameId, startTime, contest }
  ).map(gameRecord => ({
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