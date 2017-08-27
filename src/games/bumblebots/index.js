import _ from 'underscore';
import Rx from 'rxjs';
import clone from 'clone';

import { SOCKET_INCOMING } from 'battlebots/const';
import {
  sanitiseOrdersUpdate,
  resolveDroneMoves,
  POSSIBLE_MOVES,
} from './orders';
import {
  parseHexBoard,
  generateGoodName,
  generateBadName,
  BUMBLEBOTS_SPACE_WALL,
  BUMBLEBOTS_SPACE_TARGET,
  BUMBLEBOTS_SPACE_CLAIMED_0,
  BUMBLEBOTS_SPACE_CLAIMED_1,
} from './utils';

export const BUMBLEBOTS_TICK = 'BUMBLEBOTS_TICK';
export const BUMBLEBOTS_FULL_TIME = 'BUMBLEBOTS_FULL_TIME';

export const BUMBLEBOTS_TICK_TIME = 200;
export const BUMBLEBOTS_TURN_LIMIT = 100;

export function createOutgoing(state) {
  return _.object(state.bots.map(name => [name, _.pick(
    state,
    'bots',
    'board',
    'drones',
    'territory',
    'score',
    'result',
    'turnNumber',
  )]));
}

export function createInitialUpdate(bots) {
  const droneNames = [[], []];
  for (let i = 0; i < 3; i++) {
    const name = generateGoodName(droneNames[0]);
    droneNames[0].push(name);
  }
  for (let i = 0; i < 3; i++) {
    const name = generateBadName(droneNames[1]);
    droneNames[1].push(name);
  }

  const state = {
    bots,
    board: parseHexBoard(`
             # # # # # # # #
            # . . + + + . . #
           # . . . . . . . . #
          # . . # # . # # . . #
         # . . # £ . . . # . . #
        # . . . . . . . . . . . #
       # . . # . . . . . . # . . #
      # . . # . . . . . . . # £ . #
       # . . # . . . . . . # . . #
        # . . . . . . . . . . . #
         # . . # . . . . # . . #
          # £ . # # . # # . . #
           # . . . . . . . . #
            # . . x x x . . #
             # # # # # # # #
    `),
    drones: {
      [bots[0]]: {
        [droneNames[0][0]]: { position: [1, 3] },
        [droneNames[0][1]]: { position: [1, 4] },
        [droneNames[0][2]]: { position: [1, 5] },
      },
      [bots[1]]: {
        [droneNames[1][0]]: { position: [13, 11] },
        [droneNames[1][1]]: { position: [13, 10] },
        [droneNames[1][2]]: { position: [13, 9] },
      },
    },
    territory: {
      [bots[0]]: BUMBLEBOTS_SPACE_CLAIMED_0,
      [bots[1]]: BUMBLEBOTS_SPACE_CLAIMED_1,
    },
    score: {
      [bots[0]]: 0,
      [bots[1]]: 0,
    },
    result: null,
    turnNumber: 0,

    turns: [],
    droneNames,
  };
  return { state, orders: {}, outgoing: createOutgoing(state) };
}

export function sideEffects(incoming$) {
  return Rx.Observable.interval(BUMBLEBOTS_TICK_TIME)
    .skip(1)
    .take(BUMBLEBOTS_TURN_LIMIT)
    .map(turnNumber => ({ type: BUMBLEBOTS_TICK, turnNumber }));
}

export function resolveTargets(board, drones, score) {
  const dronesReachingTarget = [];
  _.each(drones, (dronesByName, name) => {
    _.each(dronesByName, ({ position }, droneId) => {
      if (board[position[0]][position[1]] === BUMBLEBOTS_SPACE_TARGET) {
        dronesReachingTarget.push({ name, droneId, position });
      }
    });
  });
  return dronesReachingTarget;
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
    let { board, drones, score } = state;

    // Get new drone positions
    drones = resolveDroneMoves(board.length, drones, orders);

    // If any drones reach a target, remove the drone, add territory to the
    // board, and increase the score.
    const dronesReachingTarget = resolveTargets(board, drones);
    _.each(dronesReachingTarget, ({ name, droneId, position }) => {
      drones = _.mapObject(drones, (dronesByName) => 
        _.omit(dronesByName, droneId),
      );
      score = { ...score, [name]: score[name] + 1 };
      board = clone(board);
      _.each(POSSIBLE_MOVES, move => {
        board[position[0] + move[0]][position[1] + move[1]] = (
          board[position[0] + move[0]][position[1] + move[1]] ||
          state.territory[name]
        );
        board[position[0]][position[1]] = BUMBLEBOTS_SPACE_WALL;
      });
    });

    // If the game is over, declare a winner.
    let result = null;
    if (update.turnNumber === BUMBLEBOTS_TURN_LIMIT) {
      result = { victor: null, reason: BUMBLEBOTS_FULL_TIME };
    }

    state = {
      ...state,
      drones,
      board,
      score,
      result,
      turnNumber: update.turnNumber,
    };
    return { state, outgoing: createOutgoing(state), orders: {} };
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
