import _ from 'underscore';
import Rx from 'rxjs';

import { createHash, createRandomHash } from '../hash';
import {
  wsObserver,
  wsObservable,
  OPEN,
  CLOSE,
  ERROR,
  INCOMING,
  OUTGOING,
} from './sockets';

export const ADD = 'add';
export const REMOVE = 'remove';
const DB_AUTHENTICATE = 'authenticate';

export default function Authenticator(sources) {
  const TIMEOUT = 10000;

  // When a websocket connects and sends a login message, a database request
  // is made to find the details of the requested bot.
  const dbLookupBot$ = sources.ws
    .filter(({ type }) => type === OPEN)
    .flatMap(({ socketId }) => sources.ws
      .first(({ type, socketId: id }) => type === INCOMING && socketId === id)
      .map(({ payload: { game, bot, password, contest }}) => ({
        type: DB_AUTHENTICATE,
        socketId,
        game,
        bot,
        contest,
        gen: db => db.collection('bots').findOne({ game, name: bot, password }),
      }))
    );

  // If the client does not send an authenticate message in the timeout period,
  // or if the bot is not found with the input hash, then the login is rejected.
  const isloginValid$ = sources.ws
    .filter(({ type }) => type === OPEN)
    .flatMap(({ socketId }) => Rx.Observable
      .merge(
        Rx.Observable.timer(TIMEOUT)
          .map(() => ({ socketId, loginValid: false })),

        sources.db
          .filter(({ request: { type, socketId: id } }) => (
            type === DB_AUTHENTICATE && socketId === id
          ))
          .flatMap(response$ => response$
            .map(response => {
              if (!response) return { socketId, loginValid: false };
              const { bot, game, contest } = response$.request;

              return { socketId, loginValid: true, bot, game, contest }
            })
            .catch(() => Rx.Observable.of({ socketId, loginValid: false }))
          ),
      )
      .first()
    );

  // A rejection message is sent to clients which fail to authenticate,
  // and then the connection is closed.
  const wsRejection$ = isloginValid$
    .filter(({ loginValid }) => !loginValid)
    .flatMap(({ socketId }) => Rx.Observable.from([
      { type: OUTGOING, socketId, payload: { authentication: 'failed' } },
      { type: CLOSE, socketId },
    ]));

  // A confirmation message is sent to successfully-connected clients.
  const wsConfirm$ = isloginValid$
    .filter(({ loginValid }) => loginValid)
    .map(({ socketId, game, bot, contest }) => ({
      type: OUTGOING,
      socketId,
      payload: {authentication: 'OK', game, bot, contest },
    }));

  // The output "sink" of this component is a stream of add/remove
  // authenticated socket events.

  // "Add authenticated socket" events.
  const add$ = isloginValid$
    .filter(({ loginValid }) => loginValid)
    .map(({ socketId, game, bot, contest }) => ({
      type: ADD,
      socketId,
      data: { game, bot, contest },
    }));

  // Emit a "Remove authenticated socket" events when an authenticated socket
  // disconnects.
  const authenticated$ = add$.flatMap(add =>
    Rx.Observable.of(add).concat(
      sources.ws
        .first(({ type, socketId }) => (
          (type === CLOSE || type === ERROR) && add.socketId === socketId
        ))
        .mapTo({ ...add, type: REMOVE })
    )
  );

  const ws = Rx.Observable.merge(
    wsRejection$,
    wsConfirm$,
  );

  const log = authenticated$.map(({ type, data: { bot, game }}) =>
    `The ${game} bot ${bot} has ${type === ADD ? 'connected' : 'disconnected'}.`
  );

  const sinks = { ws, db: dbLookupBot$, log, sockets: authenticated$ }
  return sinks;
}
