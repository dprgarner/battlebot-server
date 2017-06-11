const Rx = require('rxjs');

const createAuthenticatedServer = require('./server');
const game = require('./game');
const { updater, validator, createInitialState } = require('./numberwang');

createAuthenticatedServer(incoming$ => {
  const players = ['A', 'B'];
  const initialState = createInitialState(players);

  return incoming$
    .let(game({ updater, validator, players, initialState }))
    .do(x => console.log('out:', x), null, () => console.log('Game completed'))
});