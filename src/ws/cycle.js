import Rx from 'rxjs';
import { run } from '@cycle/rxjs-run';

import makeWsDriver, { OPEN, CLOSE, OUTGOING }  from './sockets';
import { makeDbDriver } from '../db';

function main(sources) {
  const inc$ = sources.ws;
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

  const dbRequest$ = inc$
    .filter(({ type }) => type === OPEN)
    .map(({ socketId }) => ({
      socketId,
      gen: db => db
        .collection('spam')
        .insertOne({ socketId }),
    }))
    .merge(
      Rx.Observable.of({ gen: db => db.collection('spam').find({}).toArray() })
        .delay(10)
    )
    .share();  // Required for response$.request === request

  const dbResponse$ = dbRequest$
    .map(request => sources.db
      .first(response$ => response$.request.gen === request.gen)
      .mergeAll()
      .map(response => response.result || response)
    )
    .mergeAll();

  const out$ = tickOut$;

  const log = Rx.Observable.merge(
    inc$.map(x => 'in:  ' + JSON.stringify(x)),
    out$.map(x => 'out: ' + JSON.stringify(x)),
    dbResponse$,
  );
  const sinks = { log, ws: out$, db: dbRequest$ };
  return sinks;
}

const drivers = {
  log: msg$ => { msg$.addListener({ next: msg => console.log(msg) }); },
  ws: makeWsDriver({ port: 3000 }),
  db: makeDbDriver(),
};

run(main, drivers);
