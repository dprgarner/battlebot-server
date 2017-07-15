/*
  Experiments in running the websocket server with CycleJS.
*/
import Rx from 'rxjs/Rx';
import WebSocket from 'ws';
import { adapt } from '@cycle/run/lib/adapt';
import { run } from '@cycle/rxjs-run';

import { createRandomHash } from '../hash';
import { wsObserver, wsObservable } from './sockets';

function createWsUpdate$(socketId, ws, outgoing$) {
  // Handles websocket-specific listeners, tagging and untagging instructions
  // to send and receive messages to the client and closing the connection.

  outgoing$
    .takeUntil(outgoing$.filter(
      ({ type }) => type === 'close' || type === 'error'
    ))
    .filter(({ type }) => type === 'outgoing')
    .map(({ payload }) => payload)
    .subscribe(wsObserver(ws));

  const incoming$ = wsObservable(ws);
  return incoming$
    .map(payload => ({ type: 'incoming', socketId, payload }))
    .startWith({ type: 'open', socketId })
    .concat(Rx.Observable.of({ type: 'close', socketId }))
    .catch(error => Rx.Observable.of(
      { type: 'error', socketId, payload: { error }}
    ));
}

function getOpenSockets$(update$) {
  // Given the websocket update stream, this function returns a stream which
  // emits streams every time a socket connects or disconnects. These emitted
  // streams emit every currently-open socket. (I guess it could just be an
  // emitted array, but hey, streams)
  return update$
    .filter(({ type }) => type !== 'incoming' )
    .startWith({})
    .scan((sockets, { type, socketId }) => {
      if (type === 'open') sockets[socketId] = true;
      if (type === 'close' || type === 'error') delete sockets[socketId];
      return sockets;
    })
    .map(sockets => Rx.Observable.from(Object.keys(sockets)))
}

function makeWsDriver(opts) {
  // A Cycle.js driver for a WebSocket server.
  console.log(`Starting WebSocket server...`);
  const wss = new WebSocket.Server(opts);

  function WsDriver(outgoing$) {
    // Convert CycleJS xstream into RxJS stream
    outgoing$ = Rx.Observable.from(outgoing$);

    const ws$ = Rx.Observable.create(observer => {
      wss.on('connection', (ws) => {
        const socketId = createRandomHash();
        const wsOutgoing$ = outgoing$
          .filter(({ socketId: id }) => socketId === id);

        const update$ = createWsUpdate$(socketId, ws, wsOutgoing$);
        observer.next(update$);
      });
    }).share();

    const incoming$ = adapt(ws$.mergeAll());

    // For convenience: a stream which emits a stream of all open sockets
    // whenever a socket opens or closes.
    incoming$.socket$$ = getOpenSockets$(incoming$);

    return incoming$;
  }

  return WsDriver;
}


function main(sources) {
  const inc$ = sources.ws;
  const open$$ = sources.ws.socket$$;
  const timer = Rx.Observable.interval(1000);

  const out$ = timer.withLatestFrom(open$$, (time, socket$) => {
    if (time % 10 === 0) {
      return socket$.map(socketId => ({ type: 'close', socketId }));
    }
    return socket$
      .map(socketId => ({ type: 'outgoing', socketId, payload: { time } }))
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
