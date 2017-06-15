const _ = require('underscore');
const Rx = require('rxjs');
const WebSocket = require('ws');

function matchPlayers(connection$) {
  // Creates a stream of matched pairs of connected players. A new game should
  // be started when this stream emits an item.
  return connection$
    .startWith({ waiting: [], createGame: null })
    .scan(({ waiting: prevWaiting }, connection) => {
      const waiting = prevWaiting.filter(({ ws }) => (
        ws.readyState === WebSocket.OPEN
      ));
      const matchedSocket = _.find(waiting, waitingSocket => (
        waitingSocket.botId !== connection.botId
      ));
      if (matchedSocket) {
        return {
          waiting: _.without(waiting, matchedSocket),
          createGame: [matchedSocket, connection],
        };
      }
      return { waiting: waiting.concat(connection), createGame: null };
    })
    .filter(({ createGame }) => createGame)
    .map(({ createGame }) => createGame);
}

module.exports = matchPlayers;