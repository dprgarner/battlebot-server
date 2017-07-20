import _ from 'underscore';
import Rx from 'rxjs';

// import getVictor from './getVictor';
import games from '../games';
import makeWsDriver, { CLOSE, INCOMING, OUTGOING }  from './sockets';
import { createShortRandomHash } from '../hash';

function runGame(validator, reducer) {
  // This function transforms a stream of incoming turns into a stream of updates,
  // validating the turns and updating the state of the game.

  // The 'reducer' can in general be non-deterministic (make random calls),
  // so every scan must be evaluated EXACTLY once, regardless of the
  // subscriptions. (Hence the shareReplay.)
  return ({ incoming }) => {
    const update$ = incoming.scan(({ state: oldState }, turn) => {
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
      update: turn$.map(({ state, turn }) => ({ state, turn })),
      log: turn$.map(({ log }) => log).filter(msg => msg),
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
  const props$ = sources.props.first();


  const tick$ = Rx.Observable.interval(1000);




  return {
    complete: props$.switchMap(props =>
      sources.ws.filter(({ type, socketId }) => (
        type === INCOMING && socketId === props.sockets[0].socketId
      ))
      .take(3)
      .ignoreElements()
      .concat(Rx.Observable.of(props))
    ),

    ws: props$.switchMap(props => {
      const game = props.game;
      const [player1, player2] = props.sockets;

      return tick$.flatMap(i => Rx.Observable.from([
        {
          type: OUTGOING,
          socketId: player1.socketId,
          payload: { tick: i },
        },
        {
          type: OUTGOING,
          socketId: player2.socketId,
          payload: { tick: i },
        },
      ]))
    }),
  };
}