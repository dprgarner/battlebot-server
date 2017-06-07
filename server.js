// https://ws4py.readthedocs.io/en/latest/sources/managertutorial/
// https://stackoverflow.com/questions/3142705/is-there-a-websocket-client-implemented-for-python
// https://ws4py.readthedocs.io/en/latest/sources/ws4py/

const Rx = require('rxjs');
const WebSocket = require('ws');

function createWebsocketSubject(ws) {
  // Wraps the WebSocket in/out streams with an RxJS Subject. The subject acts
  // as an Observer on outgoing messages and an Observable on incoming
  // messages.
  const observer = {
    next: (x) => ws.send(x),
    error: (err) => ws.close(1, 'ERROR'),
    complete: () => ws.close(),
  };

  const observable = Rx.Observable.create(obs => {
    ws.on('message', (data) => obs.next(data));
    ws.on('error', (err) => obs.error(err));
    ws.on('close', () => obs.complete());

    return () => obs.complete();
  }).share();

  return Rx.Subject.create(observer, observable);
}

function createWebsocketStream(opts = { port: 8080 }) {
  // A stream of WebSocket subjects.
  return new Rx.Observable.create(observer => {
    console.log('Opening a server...');
    const wss = new WebSocket.Server(opts);

    wss.on('connection', (ws) => {
      observer.next(createWebsocketSubject(ws));
    });

    return () => wss.close(err => {
      if (err) console.error(err);
      console.log('Server Closed');
    });
  }).share();
}

function createOutgoingObserver(outgoing$) {
  // Subscribe the ws$ stream to this function to handle cleanup of
  // websockets when they're closed by either the client or the server.
  return ws => {
    const subscription = outgoing$.subscribe(ws);
    ws.subscribe({
      complete: () => subscription.unsubscribe(),
      err: () => subscription.unsubscribe(),
    });
  }
}

function createWebsocketServer(opts) {
  const ws$ = createWebsocketStream(opts);
  ws$.publish().connect();

  const incoming$ = ws$.mergeAll();
  incoming$.subscribe(x => console.log('In: ', x));

  const outgoing$ = Rx.Observable
    .interval(1000)
    .share()
    .do(x => console.log(x));

  ws$.subscribe(createOutgoingObserver(outgoing$));
}

createWebsocketServer();

module.exports = { createWebsocketServer };