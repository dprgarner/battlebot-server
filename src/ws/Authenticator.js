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

  // When a websocket connects, the server sends a "salt" message.
  const wsSalt$ = sources.ws
    .filter(({ type }) => type === OPEN)
    .map(({ socketId }) => ({
      type: OUTGOING,
      socketId,
      payload: { salt: createRandomHash() },
    }))
    // Creating Random Hashes is impure, so this stream should be shared.
    .share();

  // When the server receives the login message from the client, a database
  // request is made to find the details of the requested bot.
  const dbLookupBot$ = wsSalt$.flatMap(({ socketId, payload: { salt } }) => 
    sources.ws
      .first(({ type, socketId: id }) => type === INCOMING && socketId === id )
      .map(({ payload: { game, bot_id, login_hash, contest } }) => ({
        type: DB_AUTHENTICATE,
        socketId,
        salt,
        login_hash,
        contest,
        gen: db => db.collection('bots').findOne({ game, bot_id }),
      }))
    );

  function validateBot({ socketId, salt, login_hash, contest }) {
    return response => {
      if (!response) return { socketId, loginValid: false };
      const { bot_id, game, pass_hash } = response;

      const expectedHash = createHash(pass_hash + salt);
      const loginValid = expectedHash === login_hash;
      return { socketId, loginValid, contest, game, bot_id };
    };
  }

  // If the client does not send an authenticate message in the timeout period,
  // then the login is rejected.
  // The login is valid if the input login_hash is equal to the hashed value
  // of (pass_hash + salt).
  const isloginValid$ = wsSalt$
    .flatMap(({ socketId }) => Rx.Observable
      .merge(
        Rx.Observable.timer(TIMEOUT)
          .map(() => ({ socketId, loginValid: false })),

        sources.db
          .filter(({ request: { type, socketId: id } }) => (
            type === DB_AUTHENTICATE && socketId === id
          ))
          .flatMap(response$ => response$
            .map(validateBot(response$.request))
            .catch(() => Rx.Observable.of({ socketId, loginValid: false }))
          ),
      )
      .first()
    )

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
    .map(({ socketId, game, bot_id, contest }) => ({
      type: OUTGOING,
      socketId,
      payload: {authentication: 'OK', bot_id, game, contest },
    }));

  // The output "sink" of this component is a stream of add/remove
  // authenticated socket events.

  // "Add authenticated socket" events.
  const add$ = isloginValid$
    .filter(({ loginValid }) => loginValid)
    .map(({ socketId, bot_id, game, contest }) => ({
      type: ADD,
      socketId,
      data: { bot_id, game, contest },
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
    wsSalt$,
    wsRejection$,
    wsConfirm$,
  );

  const log = authenticated$.map(({ type, data: { bot_id, game }}) =>
    `The ${game} bot ${bot_id} has ${type === ADD ? 'connected' : 'disconnected'}.`
  );

  const sinks = { ws, db: dbLookupBot$, log, sockets: authenticated$ }
  return sinks;
}
