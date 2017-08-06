import _ from 'underscore';

export function createInitialState(bots) {
  return {
    bots,
    board: [
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
    ],
    marks: {
      X: bots[0],
      O: bots[1],
    },
    waitingFor: [bots[0]],
    complete: false,
  };
}

export function validator(state, turn) {
  if (state.waitingFor.indexOf(turn.name) === -1) return false;

  if (turn.mark !== 'X' && turn.mark !== 'O') return false;
  if (state.marks[turn.mark] !== turn.name) return false;

  if (!turn.space || !_.isArray(turn.space) || turn.space.length !== 2) {
    return false;
  }
  if (!_.isNumber(turn.space[0]) || !_.isNumber(turn.space[1])) return false;
  if (turn.space[0] < 0 || turn.space[0] > 2) return false;
  if (turn.space[1] < 0 || turn.space[1] > 2) return false;

  if (state.board[turn.space[0]][turn.space[1]]) return false;
  return true;
}

export function getVictor(board) {
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

export function reducer({ bots, board, marks }, turn) {
  // Must return a state object with { bots, nextPlayer, complete }.
  const nextPlayer = _.without(bots, turn.name)[0];

  const newBoard = [...board];
  newBoard[turn.space[0]] = [...board[turn.space[0]]];
  newBoard[turn.space[0]][turn.space[1]] = turn.mark;

  const winningPiece = getVictor(newBoard);
  let victor, reason;
  let complete = false;

  let waitingFor = [nextPlayer];

  if (winningPiece) {
    if (winningPiece === -1) {
      victor = null;
    } else {
      victor = marks[winningPiece];
    }
    reason = 'complete';
    complete = true;
    waitingFor = [];
  }

  return {
    board: newBoard,
    marks,
    bots,
    waitingFor,
    complete,
    victor,
    reason,
  };
}
