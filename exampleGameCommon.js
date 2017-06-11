const Rx = require('rxjs');

/* A file for testing out the game transformation with a fake game. */

function updater(state, player, turn) {
  if (!turn) {
    console.log('this happened', state);
    return state;
  }
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

const players = ['A', 'B'];
const initialState = { nextPlayer: 'A', complete: false, count: 0, players };

module.exports =  { updater, validator, players, initialState };