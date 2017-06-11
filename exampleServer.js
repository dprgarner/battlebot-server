const Rx = require('rxjs');

const createAuthenticatedServer = require('./server');
const game = require('./game');
const newGameRequests = require('./matchmaking');
const { createShortHash } = require('./hash');
const numberwang = require('./numberwang');

const games = { numberwang };

createAuthenticatedServer(incoming$ => {
  const gameName = 'numberwang';

  const game$ = incoming$
    .do(() => console.log('Message caught by game$'))
    .let(newGameRequests(gameName))
    .publishReplay();

  game$.connect()

  const outgoing$ = game$
    .do(() => console.log('New game'))
    .flatMap(players => {
      const gameId = 'asdf';

      const outgoing$ = incoming$
        .do(() => console.log('Message caught by game$'))
        .filter(({ data: { game_id, game } }) => game_id === gameId && game === gameName)
        .let(game({
          updater: games[gameName].updater,
          validator: games[gameName].validator,
          players,
          initialState: games[gameName].createInitialState(players),
        }))
        .do(x => console.log('caught by game:', x))
        .publishReplay();

      outgoing$.connect()

      return outgoing$;
    })
    .publishReplay();

  outgoing$.connect();

  return outgoing$;
});