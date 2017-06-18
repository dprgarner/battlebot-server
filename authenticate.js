const Rx = require('rxjs');

const connect = require('./db');
const { createHash, createRandomHash } = require('./hash');
const { wsObserver, wsObservable } = require('./sockets');

function login(message, salt) {
  const { bot_id, login_hash, game } = message;

  return connect(db => db.collection('users').findOne({ game, bot_id }))
    .then((res) => {
      if (!res) {
        console.log('Unrecognised bot');
        return false;
      }
      const { bot_id, pass_hash, game } = res;

      const expectedHash = createHash(pass_hash + salt);
      const loginValid = (expectedHash === login_hash);

      if (loginValid) {
        return { game, botId: bot_id };
      }

      console.log(`Invalid login attempt from ${bot_id}`);
      return false;
    });
}

function authenticate() {
  // This function transforms the ws$ stream into a stream where each event is
  // a 'connection' - an object containing the authenticated socket, the bot
  // ID, and the associated game. The stream closes and filters out
  // inauthenticated sockets.
  return ws$ => ws$
    .flatMap(ws => {
      const fromClient$ = wsObservable(ws);
      const toClient = wsObserver(ws);

      const salt = createRandomHash();
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

      // Close invalid sockets.
      loginId$
        .filter(x => !x)
        .subscribe(() => {
          toClient.next({ authentication: 'failed' });
          toClient.complete();
        });

      // Return only valid sockets.
      return loginId$
        .filter(x => x)
        .map(({ botId, game }) => ({ ws, botId, game }))
        .do(({ botId, game }) => {
          console.log(`The ${game} bot ${botId} has connected.`);
          toClient.next({ authentication: 'OK', bot_id: botId, game });
        })
        .share();
    })
    .share();
}

module.exports = authenticate;