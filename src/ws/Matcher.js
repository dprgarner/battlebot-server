import _ from 'underscore';
import clone from 'clone';
import Rx from 'rxjs';
import WebSocket from 'ws';

import { AUTHENTICATE_REMOVE } from '../const';

function MatcherWithoutContest(sources) {
  const addRemoveSocket$ = sources.sockets;
  const createGame$ = addRemoveSocket$
    .startWith({ waiting: [], newGame: null })
    .scan(({ waiting }, { type, socketId, data: { gameType, name } }) => {
      if (type === AUTHENTICATE_REMOVE) {
        const index = waiting.findIndex(x => x.socketId === socketId);
        if (index !== -1) waiting.splice(index, 1);
        return { waiting, newGame: null };
      }

      // type === ADD
      const match = _.find(waiting, waitingSocket =>
        waitingSocket.name !== name
      );

      if (!match) {
        waiting.push({ socketId, name });
        return { waiting, newGame: null };
      }

      // Found a match
      waiting.splice(waiting.indexOf(match), 1);
      return { waiting, newGame: {
        gameType,
        sockets: [
          { socketId: match.socketId, name: match.name },
          { socketId, name },
        ]
      }};
    })
    .filter(({ newGame }) => newGame)
    .map(({ newGame }) => newGame);

  return createGame$;
}

function MatcherByContest(sources) {
  const addRemoveSocket$ = sources.sockets;
  const { gamesEachWay } = sources.props;

  const createGame$ = addRemoveSocket$
    .startWith({ waiting: [], played: {}, newGame: null })
    .scan(({ waiting, played }, { type, socketId, data }) => {
      if (type === AUTHENTICATE_REMOVE) {
        const index = waiting.findIndex(x => x.socketId === socketId);
        if (index !== -1) waiting.splice(index, 1);
        return { waiting, played, newGame: null };
      }

      const { gameType, name, contest } = data;
      if (!played[name]) played[name] = {};

      const match = _.find(waiting, waitingSocket => {
        if (waitingSocket.name === name) return false;
        const gamesPlayedFirst = played[name][waitingSocket.name] || 0;
        const gamesPlayedSecond = played[waitingSocket.name][name] || 0;
        return (
          gamesPlayedFirst < gamesEachWay || gamesPlayedSecond < gamesEachWay
        );
      });

      if (!match) {
        waiting.push({ socketId, name });
        return { waiting, played, newGame: null };
      }

      // Found a match
      waiting.splice(waiting.indexOf(match), 1);

      let firstBot, secondBot;
      if ((played[match.name][name] || 0) < gamesEachWay) {
        firstBot = match;
        secondBot = { socketId, name };
      } else {
        firstBot = { socketId, name };
        secondBot = match;
      }

      // The first bot to connect goes first, unless that bot has gone first
      // (gamesEachWay) times.
      played[firstBot.name][secondBot.name] = (
        (played[firstBot.name][secondBot.name] || 0) + 1
      );
      console.log(played);

      return { waiting, played, newGame: {
        gameType,
        contest,
        sockets: [firstBot, secondBot],
      }};
    })
    .filter(({ newGame }) => newGame)
    .map(({ newGame }) => newGame);

  return createGame$;
}

function MatcherByGameType(sources) {
  const addRemoveSocket$ = sources.sockets;

  // Games which are not contests
  const matchedUncontestGame$ = MatcherWithoutContest({
    sockets: addRemoveSocket$.filter(
      addRemoveSocket => !addRemoveSocket.data.contest
    ),
  });

  // Contest games grouped by contest
  const matchedContestGame$ = addRemoveSocket$
    .filter(addRemoveSocket => addRemoveSocket.data.contest)
    .groupBy(addRemoveSocket => addRemoveSocket.data.contest)
    .flatMap(groupedByContest$ => MatcherByContest({
      sockets: groupedByContest$,
      props: sources.props,
    }));

  return Rx.Observable.merge(
    matchedUncontestGame$,
    matchedContestGame$,
  );
}

export default function Matcher(sources) {
  const addRemoveSocket$ = sources.sockets;
  const createGame$ = addRemoveSocket$
    .groupBy(addRemoveSocket => addRemoveSocket.data.gameType)
    .flatMap(groupedByGame$ => MatcherByGameType({
      sockets: groupedByGame$,
      props: sources.props,
    }));

  return { createGame: createGame$ };
}
