// https://ws4py.readthedocs.io/en/latest/sources/managertutorial/
// https://stackoverflow.com/questions/3142705/is-there-a-websocket-client-implemented-for-python
// https://ws4py.readthedocs.io/en/latest/sources/ws4py/

const Rx = require('rxjs');
const WebSocket = require('ws');
var { sha256 } = require('hash.js');


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
  // websocket observers when they're closed by the client.
  return (ws) => {
    const subscription = outgoing$.subscribe(ws);

    ws.subscribe({
      complete: () => subscription.unsubscribe(),
      err: () => subscription.unsubscribe(),
    });
  }
}

const passes = {
  'botName': 'pass123',
}

function login(message, salt) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const { login_id, login_hash } = JSON.parse(message);
        const pass = passes[login_id];
        const expectedHash = sha256()
          .update(pass || '')
          .update(salt)
          .digest('hex');
        console.log(pass, salt);
        console.log('expected:', expectedHash);
        console.log('actual:', login_hash);
        resolve((expectedHash === login_hash) && login_id);
      } catch (e) {
        reject(e);
      }
    }, 10);
  });
}

function authenticate() {
  // This function transforms the ws$ stream into a stream where each event is
  // an object containing the authenticated socket and the bot ID, and where
  // inauthenticated sockets are closed and filtered out.
  return ws$ => ws$
    .flatMap(ws => {
      const salt = sha256()
        .update(Math.random() + '')
        .digest('hex');
      ws.next(JSON.stringify({ salt }));

      // To stop any incoming messages being omitted during authentication.
      const replayWs = ws.shareReplay().skip(1);
      replayWs.publish().connect();

      return ws
        .take(1)
        .switchMap(message => Rx.Observable.fromPromise(
          login(message, salt)
        ))
        .catch(() => Rx.Observable.of(false).do(x => console.log('nope')))
        .do(x => !x && ws.complete())  // An unabashed side-effect
        .filter(x => x)
        .map((botId) => ({ ws: replayWs, botId }))
    })
    .share();
}

function createWebsocketServer(opts) {
  const aws$ = createWebsocketStream(opts)
    .let(authenticate());

  const incoming$ = aws$
    .map(({ ws }) => ws)
    .mergeAll();
  incoming$.subscribe(x => console.log('In: ', x));

  const outgoing$ = incoming$
    .delay(1000)
    .publish();

  outgoing$.connect();
  // outgoing$.subscribe(x => console.log('Out: ', x));

  aws$
    .map(({ ws }) => ws)
    .subscribe(createOutgoingObserver(outgoing$));
}

createWebsocketServer();

module.exports = { createWebsocketServer };