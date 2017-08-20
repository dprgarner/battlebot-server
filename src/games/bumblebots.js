import _ from 'underscore';
import Rx from 'rxjs';

import { SOCKET_INCOMING } from '../const';

function createOutgoing(bots, state) {
  return {};
}

const CHAR_TO_INT = {
  '.': 0,
  '#': 1,
  '+': 2,
  'x': 3,
};
const INT_TO_CHAR = _.invert(CHAR_TO_INT);

export function parseBoard(str) {
  // Convert a string-representation of the board into a [[Int]]
  // representation.
  return str.trim().split('\n')
    .map(row => row.trim().split(' ').map(c => CHAR_TO_INT[c]));
}

export function renderBoard(rows) {
  const str = rows.map(row => row.map(i => INT_TO_CHAR[i]).join(' ')).join('\n');
  return `\n${str}\n`;
}

export function createInitialUpdate(bots) {
  const state = {
    bots,
    board: parseBoard(`
      . . . . . + + + + + . . . . .
      . . . . . . + + + . . . . . .
      . . # # # . . . . . # # # . .
      . . # . . . . . . . . . # . .
      . . # . . . . . . . . . # . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . # . . . . . . . . . # . .
      . . # . . . . . . . . . # . .
      . . # # # . . . . . # # # . .
      . . . . . . x x x . . . . . .
      . . . . . x x x x x . . . . .
    `),
    drones: {
      [bots[0]]: {
        A: { position: [0, 5], fixed: false },
        B: { position: [0, 6], fixed: false },
        C: { position: [0, 7], fixed: false },
        D: { position: [0, 8], fixed: false },
        E: { position: [0, 9], fixed: false },
      },
      [bots[1]]: {
        Z: { position: [14, 5], fixed: false },
        Y: { position: [14, 6], fixed: false },
        X: { position: [14, 7], fixed: false },
        W: { position: [14, 8], fixed: false },
        V: { position: [14, 9], fixed: false },
      },
    },
    territory: {
      BotOne: 2,
      BotTwo: 3,
    },
    collected: {
      BotOne: 0,
      BotTwo: 0,
    },
    result: null,
    turns: [],
  };
  return { state, orders: {}, outgoing: createOutgoing(bots, state) };
}

export function sideEffects(incoming$) {
  return Rx.Observable.never();
}

const moves = {
  UP: [-1, 0],
  DOWN: [1, 0],
  LEFT: [0, -1],
  RIGHT: [0, 1],
};

function validateDroneOrder(state, name, order, droneId) {
  // Checks whether the move is in the correct format and not moving somewhere
  // strange. (The check for collisions with other bots happen when all the
  // turns have been received.)
  const height = state.board.length;
  const width = state.board[0].length;

  // Check each drone.
  const drone = state.drones[name][droneId];
  if (!drone) return false;
  if (drone.fixed) return false;

  if (!moves[order]) return false;

  const position = [
    drone.position[0] + moves[order][0],
    drone.position[1] + moves[order][1],
  ];
  if (position[0] < 0) return false;
  if (position[0] >= height) return false;
  if (position[1] < 0) return false;
  if (position[1] >= width) return false;

  const square = state.board[position[0]][position[1]];
  if (square !== 0 && square !== state.territory[name]) return false;

  return true;
}

export function sanitiseOrdersUpdate(state, { name, orders }) {
  return _.pick(orders, (order, droneId) =>
    validateDroneOrder(state, name, order, droneId)
  );
}

export function reducer({ state, orders }, update) {
  if (update.type === SOCKET_INCOMING) {
    // Check that the update is in the correct format: an object with orders.
    if (!update.orders) return { state, orders, outgoing: {} };

    orders = {...orders, [update.name]: sanitiseOrdersUpdate(state, update) };
  }
  return { state, outgoing: {}, orders };
}

export function getDbRecord(props) {
  // const gameType = 'noughtsandcrosses';
  // const { gameId, startTime, contest, state } = props;

  // return _.extend(
  //   _.pick({ contest }, _.identity),
  //   _.omit(state, 'waitingFor'),
  //   { gameType, _id: gameId, startTime, turns: state.turns }
  // );
}
