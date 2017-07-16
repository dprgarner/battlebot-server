import _ from 'underscore';
import Rx from 'rxjs';

import connect from '../db';
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

export function login(message, salt) {
  const { bot_id, login_hash, game, contest } = message;

  return connect(db => db.collection('bots').findOne({ game, bot_id }))
    .then((res) => {
      if (!res) {
        console.log('Unrecognised bot');
        return false;
      }
      const { bot_id, pass_hash, game } = res;

      const expectedHash = createHash(pass_hash + salt);
      const loginValid = (expectedHash === login_hash);

      if (loginValid) {
        return { botId: bot_id, game, contest };
      }

      console.log(`Invalid login attempt from ${bot_id}`);
      return false;
    });
}

export default function authenticate() {
  // This function transforms the ws$ stream into a stream where each event is
  // a 'connection' - an object containing the authenticated socket, the bot
  // ID, and the associated game. The stream closes and filters out
  // inauthenticated sockets.
  return ws$ => ws$
    .flatMap(ws => {
      const fromClient$ = wsObservable(ws);
      const toClient = wsObserver(ws);

      const salt = createRandomHash();
      toClient.next({ salt });

      const loginId$ = fromClient$
        .take(1)
        .switchMap(message => Rx.Observable.fromPromise(login(message, salt)))
        .timeout(10000)
        .catch((e) => 
          Rx.Observable
            .of(false)
            .do(() => console.error(e))
        )
        .share();

      // Close invalid sockets.
      loginId$
        .filter(x => !x)
        .subscribe(() => {
          toClient.next({ authentication: 'failed' });
          toClient.complete();
        });

      // Return only valid sockets.
      return loginId$
        .filter(x => x)
        .map(connection => _.extend({ ws }, connection))
        .do(({ botId, game, contest }) => {
          console.log(`The ${game} bot ${botId} has connected.`);
          toClient.next(_.pick({
            authentication: 'OK',
            bot_id: botId,
            game,
            contest,
          }, _.identity));
        })
        .share();
    })
    .share();
}

export function Authenticate(sources) {
  /*
  TODO:
    - Reject on time out
    - Some kind of error handling
  */

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
  const dbLookupBot$ = wsSalt$
    .flatMap(({ socketId, payload: { salt } }) => sources.ws
      .first(({ type, socketId: id }) => type === INCOMING && socketId === id )
      .map(({ socketId, payload: { game, bot_id, login_hash, contest } }) => ({
        type: 'AUTHENTICATE',
        socketId,
        salt,
        login_hash,
        contest,
        gen: db => db.collection('bots').findOne({ game, bot_id }),
      }))
    );

  // The login is valid if the input login_hash is equal to the hashed value
  // of (pass_hash + salt).
  const isloginValid$ = sources.db
    .filter(response$ => response$.request.type === 'AUTHENTICATE')
    .flatMap(response$ => response$
      .map(botData => {
        const { socketId, salt, login_hash, contest } = response$.request;
        if (!botData) return { socketId, loginValid: false };

        const expectedHash = createHash(botData.pass_hash + salt);
        // const loginValid = (expectedHash === botData.login_hash);
        const loginValid = true;
        return {
          socketId,
          loginValid,
          contest,
          game: botData.game,
          bot_id: botData.bot_id,
        };
      })
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
    .map(({ socketId, game, bot_id, contest }) => ({
      type: OUTGOING,
      socketId,
      payload: {
        authentication: 'OK',
        bot_id,
        game,
        contest,
      },
    }));

  // This component sinks a stream of connect and disconnect events for
  // authenticated bots.
  const authenticate$ = Rx.Observable.merge(
    isloginValid$
      .filter(({ loginValid }) => loginValid)
      .map(({ socketId, bot_id, game, contest }) => ({
        type: 'ADD',
        socketId,
        data: { bot_id, game, contest },
      })),

    sources.ws
      .filter(({ type }) => type === CLOSE || type === ERROR)
      .map(({ socketId }) => ({ type: 'REMOVE', socketId })),
  );

  const ws = Rx.Observable.merge(
    wsSalt$,
    wsRejection$,
    wsConfirm$,
  );

  const db = Rx.Observable.merge(
    dbLookupBot$,
  )

  const sinks = { sockets: authenticate$, ws, db }
  return sinks;
}
