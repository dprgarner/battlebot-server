import _ from 'underscore';
import Rx from 'rxjs';
import clone from 'clone';

import {
  SOCKET_INCOMING,
  SOCKET_CLOSE,
  SOCKET_ERROR,
} from 'battlebots/consts';
import * as consts from './consts';
import { generateTargetEvent, getDroneNames } from './random';
import { parseHexBoard, generateGoodName, generateBadName } from './utils';
import { sanitiseOrdersUpdate, resolveDroneMoves } from './orders';

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
    connected: bots,
  };
  return { state, orders: {}, outgoing: createOutgoing(state) };
}

function getResult(bots, score, reason) {
  let victor = null;
  if (score[bots[0]] > score[bots[1]]) {
    victor = bots[0];
  }
  if (score[bots[0]] < score[bots[1]]) {
    victor = bots[1];
  }
  return { victor, reason };
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

function onIncomingUpdate({ state, orders }, update) {
  // Check that the update is in the correct format: an object with orders.
  if (!update.orders) return { state, orders, outgoing: {} };

  // Amend the orders with the sanitised orders.
  orders = {...orders, [update.name]: sanitiseOrdersUpdate(state, update) };
  return { state, outgoing: {}, orders };
}

function onDisconnect({ state, orders }, update) {
  state = {...state, connected: _.without(state.connected, update.name)};

  let result = (!state.connected.length) ?
    getResult(state.bots, state.score, consts.BUMBLEBOTS_DISCONNECT) :
    null;

  state.result = result;

  return { state, outgoing: {}, orders };
}

function onTick({ state, orders }, update) {
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
  let result = (update.turnNumber === consts.BUMBLEBOTS_TURN_LIMIT) ?
    getResult(state.bots, score, consts.BUMBLEBOTS_FULL_TIME) :
    null;

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

export function reducer(stateWithMeta, update) {
  switch (update.type) {
    case SOCKET_INCOMING:
      return onIncomingUpdate(stateWithMeta, update);
    case SOCKET_CLOSE:
    case SOCKET_ERROR:
      return onDisconnect(stateWithMeta, update);
    case consts.BUMBLEBOTS_TICK:
      return onTick(stateWithMeta, update);
    default:
      return stateWithMeta;
  }
}
