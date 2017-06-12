const Rx = require('rxjs');
const _ = require('underscore');

/* A silly game for testing out the game transformations. */

function createInitialState(players) {
  const shuffledPlayers = (Math.random() < 0.5) ?
    players :
    [...players].reverse();

  return {
    players: shuffledPlayers,
    nextPlayer: shuffledPlayers[0],
    complete: false,
    board: { n: 0 },
  };
}

function reducer(state, turn) {
  // if (Math.random() < 0.1) throw new Error('bad reducing' + JSON.stringify(state));
  const nextPlayer = _.without(state.players, turn.player)[0];
  const n = state.board.n + turn.n;
  const complete = Math.abs(n) >= 3;

  return { players: state.players, nextPlayer, complete, board: { n } };
}

function validator(state, turn) {
  // if (Math.random() < 0.5) throw new Error('bad validation');
  return turn.player === state.nextPlayer && typeof(turn.n) === 'number';
}

module.exports =  { createInitialState, validator, reducer };