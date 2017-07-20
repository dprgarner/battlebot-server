import Rx from 'rxjs';
import { run } from '@cycle/rxjs-run';
import Collection from '@cycle/collection';

import Authenticater, { ADD, REMOVE } from './authenticate';
import makeWsDriver, { CLOSE, INCOMING, OUTGOING }  from './sockets';
import { Matcher } from './matchPlayers';
import { makeDbDriver } from '../db';
// import { adapt } from '@cycle/run/lib/adapt';

function Game(sources) {
  const props$ = sources.props;

  const tick$ = Rx.Observable.interval(1000);

  return {
    complete: props$.switchMap(props =>
      sources.ws.filter(({ type, socketId }) => (
        type === INCOMING && socketId === props.sockets[0].socketId
      ))
      .take(3)
      .ignoreElements()
      .concat(Rx.Observable.of(props))
    ),

    ws: props$.switchMap(props => {
      const game = props.game;
      const [player1, player2] = props.sockets;

      return tick$.flatMap(i => Rx.Observable.from([
        {
          type: OUTGOING,
          socketId: player1.socketId,
          payload: { tick: i },
        },
        {
          type: OUTGOING,
          socketId: player2.socketId,
          payload: { tick: i },
        },
      ]))
    }),
  };
}

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
