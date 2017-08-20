import _ from 'underscore';
import Rx from 'rxjs';

import { createHash, createRandomHash } from '../hash';
import { wsObserver, wsObservable } from './sockets';

import {
  AUTHENTICATE_ADD,
  AUTHENTICATE_REMOVE,
  SOCKET_INCOMING,
  SOCKET_OUTGOING,
  SOCKET_OPEN,
  SOCKET_CLOSE,
  SOCKET_ERROR,
} from '../const';

const AUTHENTICATE_DB = 'AUTHENTICATE_DB';
const AUTHENTICATE_TIMEOUT = 10000;

export default function Authenticator(sources) {

  // When a websocket connects and sends a login message, a database request
  // is made to find the details of the requested bot.
  const dbLookupBot$ = sources.ws
    .filter(({ type }) => type === SOCKET_OPEN)
    .flatMap(({ socketId }) => sources.ws
      .first(({ type, socketId: id }) => (
        type === SOCKET_INCOMING && socketId === id
      ))
      .map(({ payload: { gameType, name, password, contest }}) => ({
        type: AUTHENTICATE_DB,
        socketId,
        gameType,
        name,
        contest,
        gen: db => db.collection('bots').findOne({ gameType, name, password }),
      }))
    );

  // If the client does not send an authenticate message in the timeout period,
  // or if the bot is not found with the password, then the login is rejected.
  const isloginValid$ = sources.ws
    .filter(({ type }) => type === SOCKET_OPEN)
    .flatMap(({ socketId }) => Rx.Observable
      .merge(
        Rx.Observable.timer(AUTHENTICATE_TIMEOUT)
          .map(() => ({ socketId, loginValid: false })),

        sources.db
          .filter(({ request: { type, socketId: id } }) => (
            type === AUTHENTICATE_DB && socketId === id
          ))
          .flatMap(response$ => response$
            .map(response => {
              if (!response) return { socketId, loginValid: false };
              const { gameType, name, contest } = response$.request;

              return { socketId, loginValid: true, gameType, name, contest }
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
      { type: SOCKET_OUTGOING, socketId, payload: { authentication: 'failed' } },
      { type: SOCKET_CLOSE, socketId },
    ]));

  // A confirmation message is sent to successfully-connected clients.
  const wsConfirm$ = isloginValid$
    .filter(({ loginValid }) => loginValid)
    .map(({ socketId, gameType, name, contest }) => ({
      type: SOCKET_OUTGOING,
      socketId,
      payload: {authentication: 'OK', gameType, name, contest },
    }));

  // The output "sink" of this component is a stream of add/remove
  // authenticated socket events.

  // "Add authenticated socket" events.
  const add$ = isloginValid$
    .filter(({ loginValid }) => loginValid)
    .map(({ socketId, gameType, name, contest }) => ({
      type: AUTHENTICATE_ADD,
      socketId,
      data: { gameType, name, contest },
    }));

  // Emit a "Remove authenticated socket" events when an authenticated socket
  // disconnects.
  const authenticated$ = add$.flatMap(add =>
    Rx.Observable.of(add).concat(
      sources.ws
        .first(({ type, socketId }) => (
          (type === SOCKET_CLOSE || type === SOCKET_ERROR)
            && add.socketId === socketId
        ))
        .mapTo({ ...add, type: AUTHENTICATE_REMOVE })
    )
  );

  const ws = Rx.Observable.merge(
    wsRejection$,
    wsConfirm$,
  );

  const log = authenticated$.map(({ type, data: { gameType, name }}) =>
    `The ${gameType} bot ${name} has ${
      type === AUTHENTICATE_ADD ? 'connected' : 'disconnected'
    }.`
  );

  const sinks = { ws, db: dbLookupBot$, log, sockets: authenticated$ }
  return sinks;
}
