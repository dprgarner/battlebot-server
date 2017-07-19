import Rx from 'rxjs';
import { run } from '@cycle/rxjs-run';

import Authenticater, { ADD, REMOVE } from './authenticate';
import makeWsDriver, { CLOSE, OUTGOING }  from './sockets';
import { Matcher } from './matchPlayers';
import { makeDbDriver } from '../db';

function main(sources) {
  const wsIn$ = sources.ws;
  const timer = Rx.Observable.interval(1000);

  const authenticate = Authenticater({ db: sources.db, ws: sources.ws });
  const sockets$ = authenticate.sockets
    .startWith({})
    .scan((sockets, { type, socketId, data }) => {
      if (type === ADD) sockets[socketId] = data;
      if (type === REMOVE) delete sockets[socketId];
      return { ...sockets };
    });

  const matcher = Matcher({
    sockets: authenticate.sockets,
    props: Rx.Observable.of({ gamesEachWay: 10 }),
  });

  const tickOut$ = timer.withLatestFrom(sockets$, (time, sockets) => {
    const socket$ = Rx.Observable.from(Object.keys(sockets));

    if (time % 10 === 0) {
      return socket$.map(socketId => ({ type: CLOSE, socketId }));
    }
    return socket$
      .map(socketId => ({ type: OUTGOING, socketId, payload: { time } }))
  })
  .switch();

  const wsOut$ = Rx.Observable.merge(
    // tickOut$,
    authenticate.ws,
  );

  const dbRequest$ = Rx.Observable.merge(
    authenticate.db,
  );

  const log = Rx.Observable.merge(
    // wsIn$.map(x => 'in:  ' + JSON.stringify(x)),
    // wsOut$.map(x => 'out: ' + JSON.stringify(x)),
    // sockets$.map(x => Object.keys(x)),
    matcher.createGame,
    // dbRequest$,
  );
  const sinks = { log, ws: wsOut$, db: dbRequest$ };
  return sinks;
}

export default function createGameSocketServer(server) {
  const drivers = {
    log: msg$ => { msg$.addListener({ next: msg => console.log(msg) }); },
    ws: makeWsDriver(server),
    db: makeDbDriver(),
  };

  run(main, drivers);
}
