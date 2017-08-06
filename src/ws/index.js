import Rx from 'rxjs';
import { run } from '@cycle/rxjs-run';
import Collection from '@cycle/collection';

import Authenticator, { ADD, REMOVE } from './Authenticator';
import makeWsDriver, { CLOSE }  from './sockets';
import Matcher from './Matcher';
import { makeDbDriver } from '../db';

import Game from './Game';

function main(sources) {
  const wsIn$ = sources.ws;

  const authenticate = Authenticator({ db: sources.db, ws: sources.ws });
  const sockets$ = authenticate.sockets
    .startWith({})
    .scan((sockets, { type, socketId, data }) => {
      if (type === ADD) sockets[socketId] = data;
      if (type === REMOVE) delete sockets[socketId];
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
