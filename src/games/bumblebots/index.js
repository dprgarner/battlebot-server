import _ from 'underscore';
import Rx from 'rxjs';
import clone from 'clone';

import { SOCKET_INCOMING } from 'battlebots/const';
import { sanitiseOrdersUpdate, resolveDroneMoves } from './orders';
import { parseHexBoard, generateGoodName, generateBadName } from './utils';

import { generateTargetEvent, getDroneNames } from './random';

import * as consts from './consts';

export function createOutgoing(state) {
  return _.object(state.bots.map(name => [name, _.pick(
    state,
    'bots',
    'territory',
    'maxDrones',
    'board',
    'drones',
    'score',
    'result',
    'turnNumber',
  )]));
}

export function getDbRecord(props) {
  const gameType = 'BUMBLEBOTS';
  const { gameId, startTime, contest, state } = props;

  return _.extend(
    _.pick({ contest }, _.identity),
    { gameType, _id: gameId, startTime },
    _.pick(
      state,
      'bots',
      'territory',
      'maxDrones',
      'board',
      'drones',
      'score',
      'result',
      'turns',
    ),
  );
}

export function createInitialUpdate(bots) {
  const maxDrones = 3;
  const droneNames = getDroneNames(maxDrones);

  const state = {
    bots,
    territory: {
      [bots[0]]: consts.BUMBLEBOTS_SPACE_CLAIMED_0,
      [bots[1]]: consts.BUMBLEBOTS_SPACE_CLAIMED_1,
    },
    maxDrones,
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
    // TODO auto-generate, respecting maxDrones.
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
    score: {
      [bots[0]]: 0,
      [bots[1]]: 0,
    },
    result: null,
    turnNumber: 0,

    turns: [],
    droneNames,
    spawnDue: {
      [bots[0]]: [],
      [bots[1]]: [],
    },
  };
  return { state, orders: {}, outgoing: createOutgoing(state) };
}

export function sideEffects(incoming$) {
  return Rx.Observable.interval(consts.BUMBLEBOTS_TICK_TIME)
    .skip(1)
    .take(consts.BUMBLEBOTS_TURN_LIMIT)
    .map(turnNumber => ({ type: consts.BUMBLEBOTS_TICK, turnNumber }));
}

export function resolveTargets(board, drones, score) {
  const dronesReachingTarget = [];
  _.each(drones, (dronesByName, name) => {
    _.each(dronesByName, ({ position }, droneId) => {
      if (board[position[0]][position[1]] === consts.BUMBLEBOTS_SPACE_TARGET) {
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

  if (update.type === consts.BUMBLEBOTS_TICK) {
    let { board, drones, score, turns } = state;

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
      _.each(consts.POSSIBLE_MOVES, move => {
        board[position[0] + move[0]][position[1] + move[1]] = (
          board[position[0] + move[0]][position[1] + move[1]] ||
          state.territory[name]
        );
        board[position[0]][position[1]] = consts.BUMBLEBOTS_SPACE_WALL;
      });
    });

    // Potentially add a new target (flower).
    const newTarget = generateTargetEvent(state);
    if (newTarget) {
      board = clone(board);
      board[newTarget[0]][newTarget[1]] = consts.BUMBLEBOTS_SPACE_TARGET;
    }

    // Add the turn to the history.
    turns = [
      ...turns,
      { board, drones, score, turnNumber: state.turnNumber },
    ];

    // If the game is over, declare a winner.
    let result = null;
    if (update.turnNumber === consts.BUMBLEBOTS_TURN_LIMIT) {
      let victor = null;
      if (score[state.bots[0]] > score[state.bots[1]]) {
        victor = state.bots[0];
      }
      if (score[state.bots[0]] < score[state.bots[1]]) {
        victor = state.bots[1];
      }
      result = { victor, reason: consts.BUMBLEBOTS_FULL_TIME };
    }

    state = {
      ...state,
      turns,
      drones,
      board,
      score,
      result,
      turnNumber: update.turnNumber,
    };
    return { state, outgoing: createOutgoing(state), orders: {} };
  }
}
