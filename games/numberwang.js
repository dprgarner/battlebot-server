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

  // throw new Error('bad reducing');
  const nextPlayer = _.without(players, turn.player)[0];
  const n = board.n + turn.n;
  const threshold = 10;

  let victor;
  if (n >= threshold) victor = players[0];
  if (n <= -threshold) victor = players[1];
  const complete = !!victor;
  const reason = complete ? 'complete' : undefined;

  return { players, nextPlayer, complete, victor, reason, board: { n } };
}

module.exports =  { createInitialState, validator, reducer };