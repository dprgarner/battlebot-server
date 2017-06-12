const Rx = require('rxjs');
const _ = require('underscore');

/* A silly game for testing out the game transformations. */

function updater(state, player, turn) {
  // if (Math.random() < 0.1) throw new Error('bad reducing' + JSON.stringify(state));
  const nextPlayer = _.without(state.players, player)[0];
  const count = state.count + turn.n;
  const complete = Math.abs(count) >= 3;

  return { nextPlayer, complete, players: state.players, count };
}

function validator(state, player, turn) {
  // if (Math.random() < 0.5) throw new Error('bad validation');
  return player === state.nextPlayer && typeof(turn.n) === 'number';
}

function createInitialState(players) {
  const shuffledPlayers = (Math.random() < 0.5) ?
    players :
    [...players].reverse();

  return {
    players: shuffledPlayers,
    nextPlayer: shuffledPlayers[0],
    complete: false,
    count: 0,
  };
}

module.exports =  { updater, validator, createInitialState };