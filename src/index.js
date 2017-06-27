const authenticate = require('./authenticate');
const matchPlayers = require('./matchPlayers');
const playGame = require('./playGame');
const { createWebsocketStream } = require('./sockets');
const createHttpServer = require('./http');

const port = process.env.PORT || 3000;

function createGameSocketServer(opts) {
  createWebsocketStream(opts)
    .let(authenticate())
    .groupBy(({ game }) => game)
    .flatMap(matchPlayers)
    .subscribe(playGame);
}

const server = createHttpServer(port)
  .then(({ app, server }) => {
    console.log('Express server listening on port', app.get('port'));
    createGameSocketServer({ server });
  });