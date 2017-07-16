import Rx from 'rxjs';
import { run } from '@cycle/rxjs-run';

import makeWsDriver, { CLOSE, OUTGOING }  from './sockets';
import { makeDbDriver } from '../db';
import { Authenticate } from './authenticate';

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
  authenticate.sockets.subscribe(x => console.log(x));

  const wsOut$ = Rx.Observable.merge(
    // tickOut$,
    authenticate.ws,
  );

  const dbRequest$ = Rx.Observable.merge(
    authenticate.db,
  );

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
