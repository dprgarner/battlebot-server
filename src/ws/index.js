import Rx from 'rxjs';
import { run } from '@cycle/rxjs-run';
import Collection from '@cycle/collection';

import Authenticater, { ADD, REMOVE } from './authenticate';
import makeWsDriver, { CLOSE }  from './sockets';
import { Matcher } from './matchPlayers';
import { makeDbDriver } from '../db';

import Game from './Game';

function main(sources) {
  const wsIn$ = sources.ws;
  const timer = Rx.Observable.interval(1000);

  const authenticate = Authenticater({ db: sources.db, ws: sources.ws });
  const sockets$ = authenticate.sockets
    .startWith({})
    .scan((sockets, { type, socketId, data }) => {
      if (type === ADD) sockets[socketId] = data;
      if (type === REMOVE) delete sockets[socketId];
      return { ...sockets };
    });

  const matcher = Matcher({
    sockets: authenticate.sockets,
    props: Rx.Observable.of({ gamesEachWay: 10 }),
  });

  const game$ = Collection(
    Game,
    sources,
    matcher.createGame.map(data => ({ props: Rx.Observable.of(data) })),
    game => game.complete,
  );
  const completedGames$ = Collection.merge(game$, game => game.complete);

  const wsOut$ = Rx.Observable.merge(
    authenticate.ws,
    Collection.merge(game$, game => game.ws),
    completedGames$.flatMap(({ sockets }) => 
      Rx.Observable.from(sockets).map(({ socketId }) => 
        ({ type: CLOSE, socketId })
      )
    )
  ).do(x => console.log(x));

  const dbRequest$ = Rx.Observable.merge(
    authenticate.db,
  );

  const log = Rx.Observable.merge(
    matcher.createGame,
    completedGames$,
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
