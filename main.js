const _ = require('underscore');
const Rx = require('rxjs');
const WebSocket = require('ws');

var authenticate = require('./authenticate');
const { createWebsocketStream } = require('./sockets');
var playGame = require('./playGame');

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

function createGameSocketServer(opts) {
  createWebsocketStream(opts)
    .let(authenticate())
    .groupBy(({ game }) => game)
    .flatMap(matchPlayers)
    .subscribe(playGame);
}

createGameSocketServer();

module.exports = createGameServer;