import _ from 'underscore';
import Rx from 'rxjs/Rx';

import { wsObservable } from './sockets';

const COMPLETE = 'complete';
const DISCONNECTED = 'disconnect';
const TIMEOUT = 'timeout';
const IDIOCY = "Didn't write unit tests";

export default function Victor(sources) {
  // Create a stream which emits a single item when a winner is decided. 
  // The winner can be determined by the game finishing (normally or
  // abnormally), by timeout, disconnection, or by a bot repeatedly making
  // invalid turns.
  const gracePeriod = 500;
  const strikes = 3;
  const timeout = 3000;

  const props = sources.props;
  const botIds = _.pluck(props.sockets, 'bot_id');
  const socketIds = _.pluck(props.sockets, 'socketId');
  const update$ = sources.game;

  function otherBot(botId) {
    return _.without(botIds, botId)[0]
  }

  const victor$ = Rx.Observable.of(
    // Game concluded normally (or abnormally)
    update$
      .filter(({ state: { complete } }) => complete)
      .map(({ state: { victor, reason } }) => (
        { victor, reason: reason || COMPLETE }
      )),

    // One bot disconnected
    // ...connections.map(({ ws, botId }) => (
    //   wsObservable(ws)
    //     .ignoreElements()
    //     .delay(gracePeriod)
    //     .concat(Rx.Observable.of({
    //       victor: otherPlayer(botId),
    //       reason: DISCONNECTED,
    //     }))
    // )),

    // Both bots disconnected (within gracePeriod ms of each other)
    // Rx.Observable.from(connections)
    //   .concatMap(({ ws }) => wsObservable(ws).ignoreElements())
    //   .concat(Rx.Observable.of({
    //     victor: null,
    //     reason: DISCONNECTED,
    //   })),

    // Player repeatedly makes invalid turns
    ...props.sockets.map(({ botId }) => (
      update$
        .filter(({ turn }) => turn && turn.player == botId && !turn.valid)
        .concat(Rx.Observable.never())
        .take(strikes)
        .ignoreElements()
        .concat(Rx.Observable.of({
          victor: otherBot(botId),
          reason: IDIOCY,
        }))
        .delay(5)
    )),

    // The next bot fails to make a valid move within the timeout period
    update$
      .filter(({ turn }) => !turn || turn.valid)
      .timeout(timeout)
      .concat(Rx.Observable.never())
      .catch(e => Rx.Observable.empty())
      .last()
      .map(({ state: { nextPlayer } }) => ({
        victor: otherBot(nextPlayer),
        reason: TIMEOUT,
      }))
  )
  .mergeAll()
  .take(1)
  .delay(5)
  .shareReplay();

  return { victor: victor$ };
}
