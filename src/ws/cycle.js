import Rx from 'rxjs';
import { run } from '@cycle/rxjs-run';

import makeWsDriver, { CLOSE, OUTGOING }  from './sockets';

function main(sources) {
  const inc$ = sources.ws;
  const sockets$ = sources.ws.sockets$;
  const timer = Rx.Observable.interval(1000);

  const out$ = timer.withLatestFrom(sockets$, (time, sockets) => {
    const socket$ = Rx.Observable.from(sockets);

    if (time % 10 === 0) {
      return socket$.map(socketId => ({ type: CLOSE, socketId }));
    }
    return socket$
      .map(socketId => ({ type: OUTGOING, socketId, payload: { time } }))
  })
  .switch();

  const log = Rx.Observable.merge(timer, inc$, out$);
  const sinks = { ws: out$, log };
  return sinks;
}

const drivers = {
  log: msg$ => { msg$.addListener({ next: msg => console.log(msg) }); },
  ws: makeWsDriver({ port: 3000 }),
};

run(main, drivers);
