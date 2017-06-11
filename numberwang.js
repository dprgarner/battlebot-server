const Rx = require('rxjs');

/* A silly game for testing out the game transformations. */

function updater(state, player, turn) {
  // if (Math.random() < 0.1) throw new Error('bad reducing' + JSON.stringify(state));

  const count = state.count + turn.n;
  return {
    nextPlayer: state.nextPlayer === 'A' ? 'B' : 'A',
    count,
    complete: Math.abs(count) >= 3,
  };
}

function validator(state, player, turn) {
  // if (Math.random() < 0.5) throw new Error('bad validation');
  return player === state.nextPlayer && typeof(turn.n) === 'number';
}

function createInitialState(players) {
  return { nextPlayer: players[0], complete: false, count: 0, players };
}

module.exports =  { updater, validator, createInitialState };