import authenticate from './authenticate';
import matchPlayers from './matchPlayers';
import playGame from './playGame';
import { createWebsocketStream } from './sockets';
import createHttpServer from './http';

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