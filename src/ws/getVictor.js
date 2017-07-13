import _ from 'underscore';
import Rx from 'rxjs/Rx';

import { wsObservable } from './sockets';

export default function getVictor(connections, update$) {
  // Create a stream which emits a single item when a winner is decided. 
  // The winner can be determined by the game finishing (normally or
  // abnormally), by timeout, disconnection, or by a bot repeatedly making
  // invalid turns.
  const gracePeriod = 500;
  const strikes = 3;
  const timeout = 3000;

  const players = _.pluck(connections, 'botId');

  function otherPlayer(player) {
    return _.without(players, player)[0]
  }

  const reasonComplete = 'complete';
  const reasonDisconnected = 'disconnect';
  const reasonTimeout = 'timeout';
  const reasonIdiocy = "Didn't write unit tests";

  return Rx.Observable.of(
    // Game concluded normally (or abnormally)
    update$
      .filter(({ state: { complete } }) => complete)
      .map(({ state: { victor, reason } }) => (
        { victor, reason: reason || reasonComplete }
      )),

    // One player disconnected
    ...connections.map(({ ws, botId }) => (
      wsObservable(ws)
        .ignoreElements()
        .delay(gracePeriod)
        .concat(Rx.Observable.of({
          victor: otherPlayer(botId),
          reason: reasonDisconnected,
        }))
    )),

    // Both players disconnected (within gracePeriod ms of each other)
    Rx.Observable.from(connections)
      .concatMap(({ ws }) => wsObservable(ws).ignoreElements())
      .concat(Rx.Observable.of({
        victor: null,
        reason: reasonDisconnected,
      })),

    // Player repeatedly makes invalid turns
    ...players.map((player) => (
      update$
        .filter(({ turn }) => turn && turn.player == player && !turn.valid)
        .concat(Rx.Observable.never())
        .take(strikes)
        .ignoreElements()
        .concat(Rx.Observable.of({
          victor: otherPlayer(player),
          reason: reasonIdiocy,
        }))
        .delay(5)
    )),

    // The next player fails to make a valid move within the timeout period
    update$
      .filter(({ turn }) => !turn || turn.valid)
      .timeout(timeout)
      .concat(Rx.Observable.never())
      .catch(e => Rx.Observable.empty())
      .last()
      .map(({ state: { nextPlayer } }) => ({
        victor: otherPlayer(nextPlayer),
        reason: reasonTimeout,
      }))
  )
  .mergeAll()
  .take(1)
  .delay(5)
  .shareReplay();
}
