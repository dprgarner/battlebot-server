const _ = require('underscore');

function createInitialState(players) {
  return {
    players,
    board: [
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
    ],
    marks: {
      X: players[0],
      O: players[1],
    },
    nextPlayer: players[0],
    complete: false,
  };
}

function validator(state, turn) {
  if (turn.player !== state.nextPlayer) return false;

  if (state.marks[turn.mark] !== turn.player) return false;

  if (!turn.space || !_.isArray(turn.space) || turn.space.length !== 2) {
    return false;
  }
  if (!_.isNumber(turn.space[0]) || !_.isNumber(turn.space[1])) return false;
  if (turn.space[0] < 0 || turn.space[0] > 2) return false;
  if (turn.space[1] < 0 || turn.space[1] > 2) return false;

  if (state.board[turn.space[0]][turn.space[1]]) return false;
  return true;
}

function getVictor(board) {
  for (let mark of ['X', 'O']) {
    if (
      (mark === board[0][0] && mark === board[0][1] && mark === board[0][2]) ||
      (mark === board[1][0] && mark === board[1][1] && mark === board[1][2]) ||
      (mark === board[2][0] && mark === board[2][1] && mark === board[2][2]) ||
      (mark === board[0][0] && mark === board[1][0] && mark === board[2][0]) ||
      (mark === board[0][1] && mark === board[1][1] && mark === board[2][1]) ||
      (mark === board[0][2] && mark === board[1][2] && mark === board[2][2]) ||
      (mark === board[0][0] && mark === board[1][1] && mark === board[2][2]) ||
      (mark === board[0][2] && mark === board[1][1] && mark === board[2][0])
    ) return mark;    
  }
  if (_.all(_.flatten(board))) return -1;
}

function reducer({ players, board, marks }, turn) {
  // Must return a state object with { players, nextPlayer, complete }.
  const nextPlayer = _.without(players, turn.player)[0];

  const newBoard = [...board];
  newBoard[turn.space[0]] = [...board[turn.space[0]]];
  newBoard[turn.space[0]][turn.space[1]] = turn.mark;

  const winningPiece = getVictor(newBoard);
  let victor, reason;
  let complete = false;

  if (winningPiece === -1) {    
    victor = null;
    reason = 'complete';
    complete = true;
  } else if (winningPiece) {
    victor = marks[winningPiece];
    reason = 'complete';
    complete = true;
  }

  return {
    board: newBoard,
    marks,
    players,
    nextPlayer,
    complete,
    victor,
    reason,
  };
}

module.exports = { createInitialState, validator, reducer, getVictor };