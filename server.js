// https://ws4py.readthedocs.io/en/latest/sources/managertutorial/
// https://stackoverflow.com/questions/3142705/is-there-a-websocket-client-implemented-for-python
// https://ws4py.readthedocs.io/en/latest/sources/ws4py/

const Rx = require('rxjs');
const WebSocket = require('ws');
var { sha256 } = require('hash.js');


function createWebsocketSubject(ws) {
  // Wraps the WebSocket in/out streams with an RxJS Subject. The subject acts
  // as an Observer on outgoing messages and an Observable for incoming
  // messages.
  const observer = {
    next: (x) => ws.send(x),
    error: (err) => {
      console.error(err);
      ws.close(1002, 'ERROR')
    },
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
  return Rx.Observable.create(observer => {
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

const passes = {
  'botName': 'pass123',
  'otherBotName': 'pass123',
}

function createHash(str) {
  return sha256().update(str).digest('hex');
}

function login(message, salt) {
  return new Promise((resolve, reject) => {
    try {
      const { login_id, login_hash } = JSON.parse(message);
      const pass = passes[login_id];
      const expectedHash = createHash(pass + salt);

      const loginValid = (expectedHash === login_hash);
      if (loginValid) {
        console.log('Logged in:', login_id);
        return resolve(login_id);
      }
      console.log('Invalid login:', login_id);
      resolve(false);
    } catch (e) {
      reject(e);
    }
  });
}

function authenticate() {
  // This function transforms the ws$ stream into a stream where each event is
  // an object containing the authenticated socket and the bot ID, and where
  // inauthenticated sockets are closed and filtered out.
  return ws$ => ws$
    .flatMap(ws => {
      // To stop any incoming messages being omitted during authentication.
      const replayWs = ws.shareReplay().skip(1);
      replayWs.publish().connect();

      const salt = createHash(Math.random());
      ws.next(JSON.stringify({ salt }));

      const loginId$ = ws
        .take(1)
        .switchMap(message => Rx.Observable.fromPromise(login(message, salt)))
        .catch((e) => 
          Rx.Observable
            .of(false)
            .do(() => console.error(e))
        )
        .share();

      // Close invalid websockets.
      loginId$
        .filter(x => !x)
        .subscribe(() => ws.complete());

      // Return only valid websockets.
      return loginId$
        .filter(x => x)
        .map((id) => ({ ws: replayWs, id }))
    })
    .share();
}

function createWebsocketServer(transform, opts) {
  const authedSockets$ = createWebsocketStream(opts)
    .let(authenticate());

  const incoming$ = authedSockets$
    .flatMap(({ ws, id }) => ws
      .map(msg => (
        { from: id, data: JSON.parse(msg) }
      ))
    );

  const outgoing$ = incoming$
    .let(transform)
    .publish();
  outgoing$.connect();

  authedSockets$.subscribe(({ ws, id }) => {
    const subscription = outgoing$
      .filter(({ to }) => to === id)
      .map(({ data }) => JSON.stringify(data))
      .subscribe(ws);

    // Handle cleanup of the subscriptions when the socket is closed by the
    // client (or server).
    ws.subscribe({
      complete: () => subscription.unsubscribe(),
      err: () => subscription.unsubscribe(),
    });
  });
}

createWebsocketServer(incoming$ => (
  incoming$
    .delay(1000)
    .combineLatest(
      Rx.Observable.of(1,2,3),
      ({ from: id, data: { number } }, x) => (
        { to: id, data: { number: x + number }}
      )
    )
));

module.exports = { createWebsocketServer };