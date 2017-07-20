import _ from 'underscore';
import Rx from 'rxjs';

import Victor from './Victor';
import games from '../games';
import makeWsDriver, { CLOSE, INCOMING, OUTGOING }  from './sockets';
import { createShortRandomHash } from '../hash';

function runGame(validator, reducer) {
  // This function transforms a stream of incoming turns into a stream of updates,
  // validating the turns and updating the state of the game.

  // The 'reducer' can in general be non-deterministic (make random calls),
  // so every scan must be evaluated EXACTLY once, regardless of the
  // subscriptions. (Hence the shareReplay.)
  return incoming$ => {
    const update$ = incoming$.scan(({ state: oldState }, turn) => {
      let valid = false;
      let state = oldState;
      let log = null;
      try {
        valid = validator(oldState, turn);
      } catch (e) {
        log = e.message;
      }
      if (valid) {
        state = reducer(oldState, turn);
      }
      turn.valid = valid;
      return { state, turn, log };
    })
    .shareReplay();

    return {
      update: update$.map(({ state, turn }) => ({ state, turn })),
      log: update$.map(({ log }) => log).filter(msg => msg),
    };
  };
}

function addLastTurn(update$) {
  return update$
    .takeWhile(({ state: { complete } }) => !complete)
    .concat(update$
      .skipWhile(({ state: { complete } }) => !complete)
      .take(1)
    );
}

export default function Game(sources) {
  const props = sources.props;

  const gameId = createShortRandomHash();
  const gameName = props.game;
  const game = games[gameName];
  const gameReducer = runGame(game.validator, game.reducer);

  const botIds = _.pluck(props.sockets, 'bot_id');
  const socketIds = _.pluck(props.sockets, 'socketId');
  const startTime = new Date();

  console.log(
    `${gameId}: A game of ${gameName} has started between ${botIds[0]} and ${botIds[1]}.`
  );

  const gameUpdate = runGame(game.validator, game.reducer)(
    Rx.Observable.from(props.sockets)
      .flatMap(({ socketId, bot_id }) =>
        sources.ws.filter(({ type, socketId: id }) => (
          type === INCOMING && socketId === id
        ))
        .map(({ payload }) => (
          {...payload, player: bot_id, time: Date.now() }
        ))
      )
      .startWith({ state: game.createInitialState(botIds) })
  );

  const wsUpdate$ = Rx.Observable.from(props.sockets)
    .flatMap(({ bot_id, socketId }) => gameUpdate.update
      .filter(({ turn }) => (!turn || turn.valid || turn.player === bot_id))
      .map(payload => ({ type: OUTGOING, socketId, payload }))
    );

  const victor$ = Victor({ props, ws: sources.ws, game: gameUpdate.update }).victor
    .do(x => console.log('!!!',x));

  return {
    complete: victor$
      .ignoreElements()
      .concat(Rx.Observable.of(props)),

    ws: wsUpdate$,
  };
}