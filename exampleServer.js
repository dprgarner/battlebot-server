const Rx = require('rxjs');

const createAuthenticatedServer = require('./server');
const game = require('./game');
const { updater, validator, players, initialState } = require('./exampleGameCommon');

createAuthenticatedServer(incoming$ => {
  return incoming$
    .let(game({players, updater, validator, initialState }))
    .do(null, null, () => console.log('Game completed'))
});