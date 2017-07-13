import authenticate from './authenticate';
import matchPlayers from './matchPlayers';
import playGame from './playGame';
import { createWebsocketStream } from './sockets';

export default function createGameSocketServer(opts) {
  createWebsocketStream(opts)
    .let(authenticate())
    .groupBy(({ game }) => game)
    .flatMap(matchPlayers)
    .subscribe(playGame);
}
