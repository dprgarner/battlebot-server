import _ from 'underscore';
import clone from 'clone';
import Rx from 'rxjs';
import WebSocket from 'ws';

import { REMOVE } from './authenticate';

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

function MatcherWithoutContest(sources) {
  const addRemoveSocket$ = sources.sockets;
  const createGame$ = addRemoveSocket$
    .startWith({ waiting: [], newGame: null })
    .scan(({ waiting }, { type, socketId, data: { bot_id, game } }) => {
      if (type === REMOVE) {
        const index = waiting.findIndex(x => x.socketId === socketId);
        if (index !== -1) waiting.splice(index, 1);
        return { waiting, newGame: null };
      }

      // type === ADD
      const match = _.find(waiting, waitingSocket => {
        return (waitingSocket.bot_id !== bot_id);
      });

      if (!match) {
        waiting.push({ socketId, bot_id });
        return { waiting, newGame: null };
      }

      // Found a match
      waiting.splice(waiting.indexOf(match), 1);
      return { waiting, newGame: {
        game,
        sockets: [
          { socketId: match.socketId, bot_id: match.bot_id },
          { socketId, bot_id },
        ]
      }};
    })
    .filter(({ newGame }) => newGame)
    .map(({ newGame }) => newGame);

  return createGame$;
}

function MatcherByContest(sources) {
  const addRemoveSocket$ = sources.sockets;
  const props$ = sources.props;

  const createGame$ = props$.switchMap(({ gamesEachWay }) =>
    addRemoveSocket$
      .startWith({ waiting: [], played: {}, newGame: null })
      .scan(({ waiting, played }, { type, socketId, data }) => {
        if (type === REMOVE) {
          const index = waiting.findIndex(x => x.socketId === socketId);
          if (index !== -1) waiting.splice(index, 1);
          return { waiting, played, newGame: null };
        }

        const { bot_id, game, contest } = data;
        if (!played[bot_id]) played[bot_id] = {};

        const match = _.find(waiting, waitingSocket => {
          if (waitingSocket.bot_id === bot_id) return false;
          const gamesPlayedFirst = played[bot_id][waitingSocket.bot_id] || 0;
          const gamesPlayedSecond = played[waitingSocket.bot_id][bot_id] || 0;
          return (
            gamesPlayedFirst < gamesEachWay || gamesPlayedSecond < gamesEachWay
          );
        });

        if (!match) {
          waiting.push({ socketId, bot_id });
          return { waiting, played, newGame: null };
        }

        // Found a match
        waiting.splice(waiting.indexOf(match), 1);

        let firstBot, secondBot;
        if ((played[match.bot_id][bot_id] || 0) < gamesEachWay) {
          firstBot = match;
          secondBot = { socketId, bot_id };
        } else {
          firstBot = { socketId, bot_id };
          secondBot = match;
        }

        // The first bot to connect goes first, unless that bot has gone first
        // (gamesEachWay) times.
        played[firstBot.bot_id][secondBot.bot_id] = (
          (played[firstBot.bot_id][secondBot.bot_id] || 0) + 1
        );
        console.log(played);

        return { waiting, played, newGame: {
          game,
          contest,
          sockets: [firstBot, secondBot],
        }};
      })
      .filter(({ newGame }) => newGame)
      .map(({ newGame }) => newGame)
  )

  return createGame$;
}