/*
  Experiments in running the websocket server with CycleJS.
*/
import Rx from 'rxjs';
import WebSocket from 'ws';
import { adapt } from '@cycle/run/lib/adapt';

import { createRandomHash } from '../hash';

export const OPEN = 'open';
export const INCOMING = 'incoming';
export const OUTGOING = 'outgoing';
export const CLOSE = 'close';
export const ERROR = 'error';

export function wsObserver(ws) {
  // An observer for outgoing JSON messages to the socket.
  return {
    next: (x) => {
      if (ws.OPEN === ws.readyState) ws.send(JSON.stringify(x));
    },
    error: (err) => {
      console.error(err);
      ws.close(1002, 'ERROR');
    },
    complete: () => ws.close(),
  };
}

export function wsObservable(ws) {
  // An observable for incoming JSON messages from the socket.
  return Rx.Observable.create(obs => {
    ws.on('message', (data) => {
      try {
        const json = JSON.parse(data);
        obs.next(json);
      } catch (e) {
        obs.error(e);
      }
    });
    ws.on('error', (err) => {
      console.error(err);
      obs.error(err);
    });
    ws.on('close', () => obs.complete());

    return () => obs.complete();
  }).share();
}

export function createWebsocketStream(opts) {
  // A stream of WebSockets.
  return Rx.Observable.create(observer => {
    console.log(`Starting WebSocket server...`);
    const wss = new WebSocket.Server(opts);

    wss.on('connection', (ws) => {
      observer.next(ws);
    });

    return () => wss.close(err => {
      if (err) console.error(err);
      console.log('Server Closed');
    });
  }).share();
}

// Cycle.js stuff

function createWsUpdate$(socketId, ws, outgoing$) {
  // Handles websocket-specific listeners, tagging and untagging instructions
  // to send and receive messages to the client and closing the connection.
  outgoing$
    .takeWhile(({ type }) => type !== CLOSE && type !== ERROR)
    .filter(({ type }) => type === OUTGOING)
    .map(({ payload }) => payload)
    .subscribe(wsObserver(ws));

  const incoming$ = wsObservable(ws);
  incoming$.subscribe({ error: () => ws.close(1002, 'ERROR') });

  return incoming$
    .map(payload => ({ type: INCOMING, socketId, payload }))
    .startWith({ type: OPEN, socketId })
    .concat(Rx.Observable.of({ type: CLOSE, socketId }))
    .catch(error => {
      console.error(error);
      return Rx.Observable.of(
        { type: ERROR, socketId, payload: { error: error.toString() }}
      )
    });
}

function getOpenSockets$(update$) {
  // Given the websocket update stream, this function returns a stream which
  // emits an array of open socket IDs every time a socket connects or
  // disconnects.
  return update$
    .filter(({ type }) => type !== INCOMING)
    .startWith({})
    .scan((sockets, { type, socketId }) => {
      if (type === OPEN) sockets[socketId] = true;
      if (type === CLOSE || type === ERROR) delete sockets[socketId];
      return sockets;
    })
    .map(sockets => Object.keys(sockets));
}

export default function makeWsDriver(opts) {
  // A Cycle.js driver for a WebSocket server.
  const ws$ = createWebsocketStream(opts);

  function WsDriver(outgoing$) {
    // Convert CycleJS xstream into an RxJS stream.
    outgoing$ = Rx.Observable.from(outgoing$);

    // Must have .share() as the flatMap contains some unabashed side-effects.
    const incoming$ = adapt(
      ws$.flatMap(ws => {
        const socketId = createRandomHash();
        const wsOutgoing$ = outgoing$
          .filter(({ socketId: id }) => socketId === id);

        const update$ = createWsUpdate$(socketId, ws, wsOutgoing$);
        return update$;
      })
      .share()
    );
    // For convenience: a stream which emits an array of all open sockets
    // whenever a socket opens or closes.
    incoming$.sockets$ = getOpenSockets$(incoming$);
    return incoming$;
  }

  return WsDriver;
}
