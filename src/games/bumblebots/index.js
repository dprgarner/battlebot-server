import _ from 'underscore';
import Rx from 'rxjs';

import { SOCKET_INCOMING } from '../../const';
import { sanitiseOrdersUpdate, resolveDroneMoves } from './orders';
import {
  parseHexBoard,
  generateGoodName,
  generateBadName,
  BUMBLEBOTS_SPACE_TARGET,
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
      BotOne: 3,
      BotTwo: 4,
    },
    score: {
      BotOne: 0,
      BotTwo: 0,
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
    drones = resolveDroneMoves(board.length, drones, orders);
    let result = null;
    if (update.turnNumber === BUMBLEBOTS_TURN_LIMIT) {
      result = { victor: null, reason: BUMBLEBOTS_FULL_TIME };
    }
    const dronesReachingTarget = resolveTargets(board, drones);

    state = { ...state, drones, board, result, turnNumber: update.turnNumber };
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
