const Rx = require('rxjs');
const WebSocket = require('ws');

function wsObserver(ws) {
  // An observer for outgoing JSON messages to the socket.
  return {
    next: (x) => ws.send(JSON.stringify(x)),
    error: (err) => {
      console.error(err);
      ws.close(1002, 'ERROR')
    },
    complete: () => ws.close(),
  };
}

function wsObservable(ws) {
  // An observable for incoming JSON messages from the socket.
  return Rx.Observable.create(obs => {
    ws.on('message', (data) => obs.next(JSON.parse(data)));
    ws.on('error', (err) => obs.error(err));
    ws.on('close', () => obs.complete());

    return () => obs.complete();
  }).share();
}

function createWebsocketStream(opts = { port: 8080 }) {
  // A stream of WebSockets.
  return Rx.Observable.create(observer => {
    console.log(`Opening a server on port ${opts.port}`);
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

exports.wsObserver = wsObserver;
exports.wsObservable = wsObservable;
exports.createWebsocketStream = createWebsocketStream;