import _ from 'underscore';
import Rx from 'rxjs';

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
    result: null,
  };
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

function innerReducer({ bots, board, marks }, turn) {
  // Must return a state object with { bots, waitingFor=[], result=null }.
  const nextPlayer = _.without(bots, turn.name)[0];

  const newBoard = [...board];
  newBoard[turn.space[0]] = [...board[turn.space[0]]];
  newBoard[turn.space[0]][turn.space[1]] = turn.mark;

  const winningPiece = getVictor(newBoard);
  let result = null;
  let waitingFor = [nextPlayer];

  if (winningPiece) {
    const victor = (winningPiece === -1) ? null : marks[winningPiece];
    const reason = 'complete';
    waitingFor = [];
    result = { reason, victor };
  }

  return {
    bots,
    board: newBoard,
    marks,
    waitingFor,
    result,
  };
}

export function reducer({ state }, turn) {
  let valid = false;
  let log = null;
  let out = [turn.name];
  try {
    valid = validator(state, turn);
  } catch (e) {
    log = e.message;
  }
  if (valid) {
    out = state.bots;
    state = innerReducer(state, turn);
  }
  turn = { ...turn, valid };
  return { state, turn, log, out };
}

export function dbRecord(props) {
  const gameType = 'noughtsandcrosses';
  const { update$, gameId, startTime, contest } = props;

  return Rx.Observable.zip(
    update$
      .filter(update => update.turn && update.turn.valid)
      .reduce((acc, { turn }) => {
        const parsedTurn = _.omit(turn, 'valid');
        parsedTurn.time = new Date(parsedTurn.time);
        return acc.concat(parsedTurn)
      }, []),

    update$.last(),

    (turns, finalState) => _.extend(
      _.pick({ contest }, _.identity),
      _.omit(finalState.state, 'waitingFor'),
      { _id: gameId, gameType, turns, startTime }
    )
  );
}
