const authenticate = require('./authenticate');
const matchPlayers = require('./matchPlayers');
const playGame = require('./playGame');
const { createWebsocketStream } = require('./sockets');
const createHttpServer = require('./http');

const httpPort = process.env.HTTP_PORT;  // 3000?
const wsPort = process.env.WS_PORT;  // 3001?

function createGameSocketServer(opts) {
  createWebsocketStream(opts)
    .let(authenticate())
    .groupBy(({ game }) => game)
    .flatMap(matchPlayers)
    .subscribe(playGame);
}

createGameSocketServer({ port: wsPort });
createHttpServer(httpPort)
  .then((app) => {
    console.log('Express server listening on port', app.get('port'));
  });