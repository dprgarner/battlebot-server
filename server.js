const _ = require('underscore');
const Rx = require('rxjs');
const WebSocket = require('ws');

var authenticate = require('./authenticate');
const { createWebsocketStream } = require('./socketStreams');
var playGame = require('./game');

function matchPlayers(authedSocket$) {
  // A stream of matched pairs of connected players. New games should be
  // started when this stream emits an item.
  return authedSocket$
    .startWith({ waiting: [], createGame: null })
    .scan(({ waiting: prevWaiting }, authedSocket) => {
      const waiting = prevWaiting.filter(({ ws }) => (
        ws.readyState === WebSocket.OPEN
      ));
      const matchedSocket = _.find(waiting, waitingSocket => (
        waitingSocket.botId !== authedSocket.botId
      ));
      if (matchedSocket) {
        return {
          waiting: _.without(waiting, matchedSocket),
          createGame: [matchedSocket, authedSocket],
        };
      }
      return { waiting: waiting.concat(authedSocket), createGame: null };
    })
    .filter(({ createGame }) => createGame)
    .map(({ createGame }) => createGame);
}

function createGameServer(opts) {
  createWebsocketStream(opts)
    .let(authenticate())
    .groupBy(({ game }) => game)
    .flatMap(matchPlayers)
    .subscribe(playGame);
}

createGameServer();

module.exports = createGameServer;