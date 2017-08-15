import _ from 'underscore';
import Rx from 'rxjs/Rx';

import { CLOSE, ERROR }  from './sockets';

const COMPLETE = 'complete';
const DISCONNECTED = 'disconnect';
const TIMEOUT = 'timeout';
const IDIOCY = "Didn't write unit tests";

export default function Victor(sources) {
  // Create a stream which emits a single item when a game concludes. 
  // The winner can be determined by the game finishing (normally or
  // abnormally), by timeout, disconnection, or by a bot repeatedly making
  // invalid turns.
  const gracePeriod = 500;
  const strikes = 3;
  const timeout = 5000;
  const { sockets } = sources.props;

  const update$ = sources.update;

  function otherBot(name) {
    return _.without(_.pluck(sockets, 'name'), name)[0];
  }

  const victor$ = Rx.Observable.of(
    // Game concluded normally (or abnormally)
    update$
      .filter(({ state: { result } }) => result)
      .map(({ state: { result } }) => result),

    // One bot disconnected
    ...sockets.map(({ socketId, name }) =>
        sources.ws.filter(({ type, socketId: id }) => (
          (type === ERROR || type === CLOSE) && socketId === id
        ))
        .delay(gracePeriod)
        .mapTo({
          victor: otherBot(name),
          reason: DISCONNECTED,
        })
      ),

    // Both bots disconnected (within gracePeriod ms of each other)
    Rx.Observable.from(sockets)
      .concatMap(({ socketId }) =>
        sources.ws.first(({ type, socketId: id }) => (
          (type === ERROR || type === CLOSE) && socketId === id
        ))
      )
      .ignoreElements()
      .concat(Rx.Observable.of({
        victor: null,
        reason: DISCONNECTED,
      })),

    // Player repeatedly makes invalid turns
    ...sockets.map(({ name }) =>
      update$
        .filter(({ turn }) => turn && turn.name == name && !turn.valid)
        .concat(Rx.Observable.never())
        .take(strikes)
        .ignoreElements()
        .concat(Rx.Observable.of({
          victor: otherBot(name),
          reason: IDIOCY,
        }))
        .delay(5)
    ),

    // The next bot fails to make a valid move within the timeout period
    update$
      .filter(({ turn }) => !turn || turn.valid)
      .timeout(timeout)
      .concat(Rx.Observable.never())
      .catch(e => Rx.Observable.empty())
      .last()
      .map(({ state: { waitingFor } }) => ({
        victor: otherBot(waitingFor[0]),
        reason: TIMEOUT,
      }))
  )
  .mergeAll()
  .take(1)
  .delay(5)
  .shareReplay();

  return { victor: victor$ };
}
