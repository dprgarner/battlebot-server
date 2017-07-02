const _ = require('underscore');
const clone = require('clone');
const Rx = require('rxjs');
const WebSocket = require('ws');

const MAX_GAMES = 5;

function matchPlayers(connection$) {
  // Creates a stream of matched pairs of connected players. A new game should
  // be started when this stream emits an item.

  // TODO read the starting contest state from the database and concat the
  // connection stream on to this

  return connection$
    .startWith({ waiting: [], contests: {}, newGame: null })
    .scan(({ waiting: prevWaiting, contests: prevContests }, connection) => {
      const waiting = prevWaiting.filter(({ ws }) => (
        ws.readyState === WebSocket.OPEN
      ));

      let contests = prevContests;
      let contest;
      if (connection.contest) {
        contests = clone(prevContests);
        if (!contests[connection.contest]) contests[connection.contest] = {};
        contest = contests[connection.contest];
        if (!contest[connection.botId]) contest[connection.botId] = {};
      }

      const matchedSocket = _.find(waiting, waitingSocket => {
        if (waitingSocket.botId === connection.botId) return false;
        if (waitingSocket.contest !== connection.contest) return false;
        if (!waitingSocket.contest) return true;

        return (
          !contest[connection.botId][waitingSocket.botId] ||
          contest[connection.botId][waitingSocket.botId] < MAX_GAMES
        )
      });

      if (matchedSocket) {
        if (connection.contest) {
          contest[connection.botId][matchedSocket.botId] = (
            (contest[connection.botId][matchedSocket.botId] || 0) + 1
          );
          contest[matchedSocket.botId][connection.botId] = (
            (contest[matchedSocket.botId][connection.botId] || 0) + 1
          );

          console.log(contest);
        }
        return {
          waiting: _.without(waiting, matchedSocket),
          contests,
          newGame: {
            connections: _.shuffle([matchedSocket, connection]),
            contest: matchedSocket.contest,
          },
        };
      }

      return { waiting: waiting.concat(connection), contests, newGame: null };
    })
    .filter(({ newGame }) => newGame)
    .map(({ newGame }) => newGame);
}

module.exports = matchPlayers;