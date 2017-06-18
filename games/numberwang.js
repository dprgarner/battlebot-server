const Rx = require('rxjs');
const _ = require('underscore');

/* A silly game for testing out the game transformations. */

function createInitialState(players) {
  return {
    players,
    nextPlayer: players[0],
    complete: false,
    board: { n: 0 },
  };
}

function validator(state, turn) {
  // if (Math.random() < 0.5) throw new Error('bad validation');
  if (turn.player !== state.nextPlayer) return false;

  return typeof(turn.n) === 'number';
}

function reducer({ players, board }, turn) {
  // Must return a state object with { players, nextPlayer, complete }.

  // if (Math.random() < 0.1) throw new Error('bad reducing' + JSON.stringify(state));
  const nextPlayer = _.without(players, turn.player)[0];
  const n = board.n + turn.n;
  const complete = Math.abs(n) >= 3;
  let victor;
  if (n >= 3) victor = players[0];
  if (n <= -3) victor = players[1];

  return { players, nextPlayer, complete, victor, board: { n } };
}

module.exports =  { createInitialState, validator, reducer };