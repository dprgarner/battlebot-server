import _ from 'underscore';
import Rx from 'rxjs';

import { UPDATE_TURN, DISCONNECT } from '../ws/Game';
const TIMEOUT = 'timeout';

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
    invalidTurns: { [bots[0]]: 0, [bots[1]]: 0 },
    turns: [],
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
  try {
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
  } catch (e) {
    return false;
  }

  return true;
}

export function validTurnReducer(state, turn) {
  // Must return a state object with { bots, waitingFor=[], result=null }.
  const nextPlayer = _.without(state.bots, turn.name)[0];

  const board = [...state.board];
  board[turn.space[0]] = [...state.board[turn.space[0]]];
  board[turn.space[0]][turn.space[1]] = turn.mark;

  const winningPiece = getVictor(board);
  let result = null;
  let waitingFor = [nextPlayer];

  if (winningPiece) {
    const victor = (winningPiece === -1) ? null : state.marks[winningPiece];
    const reason = 'complete';
    waitingFor = [];
    result = { reason, victor };
  }

  const turns = [...state.turns, turn];

  return { ...state, board, waitingFor, result, turns };
}

const MAX_STRIKES = 3;

function otherBot(bots, name) {
  return bots[0] === name ? bots[1] : bots[0];
}

export function reducer({ state }, update) {
  let out;

  if (update.type === TIMEOUT || update.type === DISCONNECT) {
    const victor = otherBot(state.bots, update.name);
    const reason = update.type === TIMEOUT ? 'timeout' : 'disconnect';
    const result = { reason, victor };
    state = { ...state, waitingFor: [], result };
    out = state.bots;
    return { state, out };
  }

  const valid = validator(state, update);
  if (valid) {
    out = state.bots;
    state = validTurnReducer(state, update);
  } else {
    out = [update.name];
    state.invalidTurns[update.name] += 1;

    if (state.invalidTurns[update.name] === MAX_STRIKES) {
      const victor = otherBot(state.bots, update.name);
      const reason = 'idiocy';
      const result = { reason, victor };
      state = { ...state, waitingFor: [], result };
      out = state.bots;
    }
  }
  const turn = { ...update, valid };

  return { state, turn, out };
}

export function getDbRecord(props) {
  const gameType = 'noughtsandcrosses';
  const { gameId, startTime, contest, state } = props;

  return _.extend(
    _.pick({ contest }, _.identity),
    _.omit(state, 'waitingFor'),
    { gameType, _id: gameId, startTime, turns: state.turns }
  );
}

export function sideEffects(incoming$) {
  return incoming$
    .filter(({ turn }) => !turn || turn.type === UPDATE_TURN && turn.valid)
    .switchMap(({ state: { waitingFor } }) =>
      Rx.Observable.timer(4000)
        .mapTo({ type: TIMEOUT, name: waitingFor[0] })
    );
}
