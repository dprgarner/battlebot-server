const Rx = require('rxjs');
const { createHash } = require('./hash');
const { wsObserver, wsObservable } = require('./socketStreams');

const passes = {
  'numberwang': {
    'A': 'pass123',
    'B': 'pass123',
  },
}

function login(message, salt) {
  return new Promise((resolve, reject) => {
    try {
      const { bot_id, login_hash, game } = message;
      const pass = passes[game][bot_id];
      const expectedHash = createHash(pass + salt);

      const loginValid = (expectedHash === login_hash);
      if (loginValid) {
        console.log('Logged in:', bot_id);
        return resolve({ game, botId: bot_id });
      }
      console.log('Invalid login:', bot_id);
      resolve(false);
    } catch (e) {
      reject(e);
    }
  });
}

function authenticate() {
  // This function transforms the ws$ stream into a stream where each event is
  // an object containing the authenticated socket, the bot ID, and the
  // associated game, and where inauthenticated sockets are closed and
  // filtered out.
  return ws$ => ws$
    .flatMap(ws => {
      const fromClient$ = wsObservable(ws);
      const toClient = wsObserver(ws);

      const salt = createHash(Math.random());
      toClient.next({ salt });

      const loginId$ = fromClient$
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
        .subscribe(() => toClient.complete());

      // Return only valid websockets.
      return loginId$
        .filter(x => x)
        .map(({ botId, game }) => ({ ws, botId, game }))
    })
    .share();
}

module.exports = authenticate;