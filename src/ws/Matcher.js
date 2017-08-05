import _ from 'underscore';
import clone from 'clone';
import Rx from 'rxjs';
import WebSocket from 'ws';

import { REMOVE } from './authenticate';

function MatcherWithoutContest(sources) {
  const addRemoveSocket$ = sources.sockets;
  const createGame$ = addRemoveSocket$
    .startWith({ waiting: [], newGame: null })
    .scan(({ waiting }, { type, socketId, data: { bot, game } }) => {
      if (type === REMOVE) {
        const index = waiting.findIndex(x => x.socketId === socketId);
        if (index !== -1) waiting.splice(index, 1);
        return { waiting, newGame: null };
      }

      // type === ADD
      const match = _.find(waiting, waitingSocket =>
        waitingSocket.bot !== bot
      );

      if (!match) {
        waiting.push({ socketId, bot });
        return { waiting, newGame: null };
      }

      // Found a match
      waiting.splice(waiting.indexOf(match), 1);
      return { waiting, newGame: {
        game,
        sockets: [
          { socketId: match.socketId, bot: match.bot },
          { socketId, bot },
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
      if (type === REMOVE) {
        const index = waiting.findIndex(x => x.socketId === socketId);
        if (index !== -1) waiting.splice(index, 1);
        return { waiting, played, newGame: null };
      }

      const { bot, game, contest } = data;
      if (!played[bot]) played[bot] = {};

      const match = _.find(waiting, waitingSocket => {
        if (waitingSocket.bot === bot) return false;
        const gamesPlayedFirst = played[bot][waitingSocket.bot] || 0;
        const gamesPlayedSecond = played[waitingSocket.bot][bot] || 0;
        return (
          gamesPlayedFirst < gamesEachWay || gamesPlayedSecond < gamesEachWay
        );
      });

      if (!match) {
        waiting.push({ socketId, bot });
        return { waiting, played, newGame: null };
      }

      // Found a match
      waiting.splice(waiting.indexOf(match), 1);

      let firstBot, secondBot;
      if ((played[match.bot][bot] || 0) < gamesEachWay) {
        firstBot = match;
        secondBot = { socketId, bot };
      } else {
        firstBot = { socketId, bot };
        secondBot = match;
      }

      // The first bot to connect goes first, unless that bot has gone first
      // (gamesEachWay) times.
      played[firstBot.bot][secondBot.bot] = (
        (played[firstBot.bot][secondBot.bot] || 0) + 1
      );
      console.log(played);

      return { waiting, played, newGame: {
        game,
        contest,
        sockets: [firstBot, secondBot],
      }};
    })
    .filter(({ newGame }) => newGame)
    .map(({ newGame }) => newGame);

  return createGame$;
}

function MatcherByGame(sources) {
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
    .groupBy(addRemoveSocket => addRemoveSocket.data.game)
    .flatMap(groupedByGame$ => MatcherByGame({
      sockets: groupedByGame$,
      props: sources.props,
    }));

  return { createGame: createGame$ };
}
