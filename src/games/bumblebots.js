import _ from 'underscore';
import Rx from 'rxjs';

import { SOCKET_INCOMING } from '../const';
import merge from 'merge';

const POSSIBLE_MOVES = {
  UP: [-1, 0],
  DOWN: [1, 0],
  LEFT: [0, -1],
  RIGHT: [0, 1],
};

export const BUMBLEBOTS_TICK = 'BUMBLEBOTS_TICK';
export const BUMBLEBOTS_FULL_TIME = 'BUMBLEBOTS_FULL_TIME';

export const BUMBLEBOTS_TICK_TIME = 250;
export const BUMBLEBOTS_TURN_LIMIT = 100;

function createOutgoing(bots, state) {
  return {};
}

const CHAR_TO_INT = {
  '.': 0,
  '#': 1,
  '£': 2,
  '+': 3,
  'x': 4,
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
      . £ # . . . . . . . . . # . .
      . . . . . . . . . . . . . £ .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . # . £ . . . . . . . # . .
      . . # . . . . . . . . . # . .
      . . # # # . . . . . # # # £ .
      . . . . . . x x x . . . . . .
      . . . . . x x x x x . . . . .
    `),
    drones: {
      [bots[0]]: {
        A: { position: [0, 5] },
        B: { position: [0, 6] },
        C: { position: [0, 7] },
        D: { position: [0, 8] },
        E: { position: [0, 9] },
      },
      [bots[1]]: {
        Z: { position: [14, 5] },
        Y: { position: [14, 6] },
        X: { position: [14, 7] },
        W: { position: [14, 8] },
        V: { position: [14, 9] },
      },
    },
    territory: {
      BotOne: 3,
      BotTwo: 4,
    },
    collected: {
      BotOne: 0,
      BotTwo: 0,
    },
    result: null,
    turnNumber: 0,
    turns: [],
  };
  return { state, orders: {}, outgoing: createOutgoing(bots, state) };
}

export function sideEffects(incoming$) {
  return Rx.Observable.interval(BUMBLEBOTS_TICK_TIME)
    .skip(1)
    .take(BUMBLEBOTS_TURN_LIMIT)
    .map(turnNumber => ({ type: BUMBLEBOTS_TICK, turnNumber }));
}

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

  if (!POSSIBLE_MOVES[order]) return false;

  const position = [
    drone.position[0] + POSSIBLE_MOVES[order][0],
    drone.position[1] + POSSIBLE_MOVES[order][1],
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

function resolveDroneMoves(state, orders) {
  // Construct arrays of the bots' current positions and the positions to
  // which they are trying to move.
  const currentPositions = _.times(state.board.length, () => []);
  const intendedPositions = _.times(state.board.length, () => 
    _.times(state.board[0].length, () => [])
  );

  _.each(state.drones, (dronesByBot, name) =>
    _.each(dronesByBot, ({ position: [i, j] }, droneId ) => {
      const drone = state.drones[name][droneId];
      const order = (orders[name] || {})[droneId] || null;
      const moveTo = order ? [
        drone.position[0] + POSSIBLE_MOVES[order][0],
        drone.position[1] + POSSIBLE_MOVES[order][1],
      ] : null;

      currentPositions[i][j] = {
        name,
        droneId,
        position: drone.position,
        moveTo,
      };
      if (moveTo) {
        intendedPositions[moveTo[0]][moveTo[1]].push(currentPositions[i][j]);
      }
    })
  );

  // Stop two or more drones if they are trying to move into the same square.
  _.each(intendedPositions, (row, i) => {
    _.each(row, (botsInSquare, j) => {
      if (botsInSquare.length > 1) {
        _.each(botsInSquare, drone => {
          drone.moveTo = null;
        });
        intendedPositions[i][j] = [];
      }
    })
  });

  // Stop drone from moving into other stopped drones, or swapping places.
  // If a drone is blocked and its move is cancelled, then more drones may be
  // blocked and need their moves cancelled, so they should be checked again.
  let allMovesValid;
  while (!allMovesValid) {
    allMovesValid = true;
    _.each(intendedPositions, (row, i) => {
      _.each(row, ([drone], j) => {
        if (!drone || !currentPositions[i][j]) return;

        // There is a drone in space (i, j) and a drone trying to move in to
        // this space. This is allowed iff the drone is moving out of the space,
        // but not swapping places with the incoming drone.
        if (
          currentPositions[i][j].moveTo &&
          !_.isEqual(currentPositions[i][j].moveTo, drone.position)
        ) {
          return;
        }

        // The drone in space (i, j) is blocked by another drone, and its move
        // should be cancelled.
        drone.moveTo = null;
        intendedPositions[i][j] = [];
        allMovesValid = false;
      })
    });
  }

  // Delete from intendedPositions if the bot is blocked.
  const newDrones = {};
  _.each(_.flatten(intendedPositions), ({ name, droneId, moveTo }) => {
    if (!newDrones[name]) newDrones[name] = {};
    newDrones[name][droneId] = {
      ...state.drones[name][droneId],
      position: moveTo,
    };
  });
  return merge.recursive(true, state.drones, newDrones);
}

export function reducer({ state, orders }, update) {
  if (update.type === SOCKET_INCOMING) {
    // Check that the update is in the correct format: an object with orders.
    if (!update.orders) return { state, orders, outgoing: {} };

    // Amend the orders with the sanitised orders.
    orders = {...orders, [update.name]: sanitiseOrdersUpdate(state, update) };
    return { state, outgoing: {}, orders };
  }

  if (update.type === BUMBLEBOTS_TICK) {
    const drones = resolveDroneMoves(state, orders);
    let result = null;
    if (update.turnNumber === BUMBLEBOTS_TURN_LIMIT) {
      result = { victor: null, reason: BUMBLEBOTS_FULL_TIME };
    }
    state = { ...state, drones, result, turnNumber: update.turnNumber };
    return { state, outgoing: {}, orders: {} };
  }
}

export function getDbRecord(props) {
  const gameType = 'bumblebots';
  const { gameId, startTime, contest, state } = props;

  return _.extend(
    _.pick({ contest }, _.identity),
    state,
    { gameType, _id: gameId, startTime, turns: state.turns }
  );
}
