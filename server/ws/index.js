import Rx from 'rxjs';
import { run } from '@cycle/rxjs-run';
import Collection from '@cycle/collection';

import { makeDbDriver } from 'battlebots/db';

import Authenticator from './Authenticator';
import Game from './Game';
import makeWsDriver from './sockets';
import Matcher from './Matcher';
import { AUTHENTICATE_ADD, AUTHENTICATE_REMOVE } from './consts';

function main(sources) {
  const wsIn$ = sources.ws;

  const authenticate = Authenticator({ db: sources.db, ws: sources.ws });
  const sockets$ = authenticate.sockets
    .startWith({})
    .scan((sockets, { type, socketId, data }) => {
      if (type === AUTHENTICATE_ADD) sockets[socketId] = data;
      if (type === AUTHENTICATE_REMOVE) delete sockets[socketId];
      return { ...sockets };
    });

  const matcher = Matcher({
    sockets: authenticate.sockets,
    props: { gamesEachWay: 5 },
  });

  const game$ = Collection(
    Game,
    sources,
    matcher.createGame
      .delay(100)  // To 'guarantee' the auth confirmation arrives first.
      .map(props => ({ props })),
    game => game.complete,
  );

  const wsOut$ = Rx.Observable.merge(
    authenticate.ws,
    Collection.merge(game$, game => game.ws),
  );
  const dbRequest$ = Rx.Observable.merge(
    authenticate.db,
    Collection.merge(game$, game => game.db),
  );
  const log = Rx.Observable.merge(
    authenticate.log,
    Collection.merge(game$, game => game.log),
  );

  const sinks = { log, ws: wsOut$, db: dbRequest$ };
  return sinks;
}

export default function createGameSocketServer(server) {
  const drivers = {
    log: msg$ => { msg$.addListener({ next: msg => console.log(msg) }); },
    ws: makeWsDriver(server),
    db: makeDbDriver(),
  };

  run(main, drivers);
}
