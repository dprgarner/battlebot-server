import Rx from 'rxjs';
import { run } from '@cycle/rxjs-run';

import makeWsDriver, {
  OPEN, CLOSE, ERROR, INCOMING, OUTGOING
}  from './sockets';
import { makeDbDriver } from '../db';
import { createRandomHash, createHash } from '../hash';

function Authenticate(sources) {
  const salt$ = sources.ws
    .filter(({ type }) => type === OPEN)
    .map(({ socketId }) => ({
      type: OUTGOING,
      socketId,
      // TODO zip with sources.randomHash$ for purity
      payload: { salt: createRandomHash() },
    }))
    .share();

  const dbLookupBot$ = salt$
    .flatMap(({ socketId, payload: { salt } }) => sources.ws
      .first(({ type, socketId: id }) => type === INCOMING && socketId === id )
      .map(({ socketId, payload: { game, bot_id, login_hash } }) => ({
        type: 'AUTHENTICATE',
        socketId,
        salt,
        login_hash,
        gen: db => db.collection('bots').findOne({ game, bot_id }),
      }))
    );

  const isloginValid$ = sources.db
    .filter(response$ => response$.request.type === 'AUTHENTICATE')
    .flatMap(response$ => response$
      .map(botData => {
        const { socketId, salt, login_hash } = response$.request;
        if (!botData) return { socketId, loginValid: false };

        const expectedHash = createHash(botData.pass_hash + salt);
        // const loginValid = (expectedHash === botData.login_hash);
        const loginValid = true;
        return {
          socketId,
          loginValid,
          game: botData.game,
          bot_id: botData.bot_id,
        };
      })
    );

  const rejection$ = isloginValid$
    .filter(({ loginValid }) => !loginValid)
    .flatMap(({ socketId }) => Rx.Observable.from([
      { type: OUTGOING, socketId, payload: { authentication: 'failed' } },
      { type: CLOSE, socketId },
    ]));

  const confirm$ = isloginValid$
    .filter(({ loginValid }) => loginValid)
    .map(({ socketId, game, bot_id }) => ({
      type: OUTGOING,
      socketId,
      payload: {
        authentication: 'OK',
        bot_id,
        game,
      },
    }));

  const authenticated$ = Rx.Observable.merge(
    isloginValid$
      .filter(({ loginValid }) => loginValid)
      .map((data) => ({ type: 'ADD', ...data })),

    sources.ws
      .filter(({ type }) => type === CLOSE || type === ERROR)
      .map(({ socketId }) => ({ type: 'REMOVE', socketId })),
  )
    .startWith({})
    .scan((sockets, { type, socketId, bot_id, game }) => {
      if (type === 'ADD') sockets[socketId] = { bot_id, game };
      if (type === 'REMOVE') delete sockets[socketId];
      return {...sockets};
    });

  const ws = Rx.Observable.merge(
    salt$,
    rejection$,
    confirm$,
  );

  const db = Rx.Observable.merge(
    dbLookupBot$,
  )

  const sinks = { sockets: authenticated$, ws, db }
  return sinks;
}

function main(sources) {
  const wsIn$ = sources.ws;
  const sockets$ = sources.ws.sockets$;
  const timer = Rx.Observable.interval(1000);

  const tickOut$ = timer.withLatestFrom(sockets$, (time, sockets) => {
    const socket$ = Rx.Observable.from(sockets);

    if (time % 10 === 0) {
      return socket$.map(socketId => ({ type: CLOSE, socketId }));
    }
    return socket$
      .map(socketId => ({ type: OUTGOING, socketId, payload: { time } }))
  })
  .switch();

  const authenticate = Authenticate({ db: sources.db, ws: sources.ws });

  const wsOut$ = Rx.Observable.merge(
    // tickOut$,
    authenticate.ws,
  );

  const dbRequest$ = Rx.Observable.merge(
    authenticate.db,
  );

  authenticate.sockets.subscribe(x => console.log(x));

  const log = Rx.Observable.merge(
    wsIn$.map(x => 'in:  ' + JSON.stringify(x)),
    wsOut$.map(x => 'out: ' + JSON.stringify(x)),
    // dbRequest$,
  );
  const sinks = { log, ws: wsOut$, db: dbRequest$ };
  return sinks;
}

const drivers = {
  log: msg$ => { msg$.addListener({ next: msg => console.log(msg) }); },
  ws: makeWsDriver({ port: 3000 }),
  db: makeDbDriver(),
};

run(main, drivers);
