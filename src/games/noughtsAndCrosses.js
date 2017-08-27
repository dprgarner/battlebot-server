import _ from 'underscore';
import Rx from 'rxjs';

import { SOCKET_CLOSE, SOCKET_ERROR } from 'battlebots/const';

const REASON_TIMEOUT = 'timeout';
const REASON_DISCONNECT = 'disconnect';
const REASON_IDIOCY = "Didn't write unit tests";
const REASON_COMPLETE = 'complete';

const MAX_STRIKES = 3;
const TIME_LIMIT = 4000;

function otherBot(bots, name) {
  return bots[0] === name ? bots[1] : bots[0];
}

function createOutgoing(bots, state, turn) {
  return _.object(bots.map(name =>
    [name, { state: _.omit(state, 'turns'), turn }]
  ));
}

export function createInitialUpdate(bots) {
  const state = {
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
  return { state, outgoing: createOutgoing(bots, state) };
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
    const reason = REASON_COMPLETE;
    waitingFor = [];
    result = { reason, victor };
  }

  const turns = [...state.turns, turn];

  return { ...state, board, waitingFor, result, turns };
}

export function reducer({ state }, update) {
  let outgoing;

  if ([REASON_TIMEOUT, SOCKET_CLOSE, SOCKET_ERROR].includes(update.type)) {
    const victor = otherBot(state.bots, update.name);
    const reason = update.type === REASON_TIMEOUT ?
      REASON_TIMEOUT :
      REASON_DISCONNECT;
    const result = { reason, victor };
    state = { ...state, waitingFor: [], result };
    outgoing = createOutgoing(state.bots, state);
    return { state, outgoing };
  }

  const valid = validator(state, update);
  const turnWithoutType = _.omit(update, 'type');
  const turn = { ...turnWithoutType, valid };
  if (valid) {
    state = validTurnReducer(state, turnWithoutType);
    outgoing = createOutgoing(state.bots, state, turn);
  } else {
    state = {
      ...state,
      invalidTurns: {
        ...state.invalidTurns,
        [update.name]: state.invalidTurns[update.name] + 1,
      },
    };
    outgoing = createOutgoing([update.name], state, turn);

    if (state.invalidTurns[update.name] === MAX_STRIKES) {
      const victor = otherBot(state.bots, update.name);
      const reason = REASON_IDIOCY;
      const result = { reason, victor };
      state = { ...state, waitingFor: [], result };
      outgoing = createOutgoing(state.bots, state);
    }
  }
  return { state, turn, outgoing };
}

export function sideEffects(incoming$) {
  return incoming$
    .filter(({ turn }) => !turn || turn.valid)
    .switchMap(({ state: { waitingFor } }) =>
      Rx.Observable.timer(TIME_LIMIT)
        .mapTo({ type: REASON_TIMEOUT, name: waitingFor[0] })
    );
}

export function getDbRecord(props) {
  const gameType = 'NOUGHTS_AND_CROSSES';
  const { gameId, startTime, contest, state } = props;

  return _.extend(
    _.pick({ contest }, _.identity),
    _.omit(state, 'waitingFor'),
    { gameType, _id: gameId, startTime, turns: state.turns }
  );
}
