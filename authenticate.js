const Rx = require('rxjs');
const { sha256 } = require('hash.js');

const passes = {
  'A': 'pass123',
  'B': 'pass123',
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
        .timeout(1000)
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

module.exports = authenticate;