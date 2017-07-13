import Rx from 'rxjs';
import WebSocket from 'ws';

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
    ws.on('error', (err) => obs.error(err));
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
