import _ from 'underscore';
import merge from 'merge';

import {
  POSSIBLE_MOVES,
  BUMBLEBOTS_SPACE_EMPTY,
  BUMBLEBOTS_SPACE_TARGET,
} from './consts';

function validateDroneOrder(state, name, order, droneId) {
  // Checks whether the move is in the correct format and not moving somewhere
  // strange. (The check for collisions with other bots happen when all the
  // turns have been received.)
  const height = state.board.length;
  const width = state.board[state.board.length - 1].length;

  // Check each drone.
  const drone = state.drones[name][droneId];
  if (!drone) return false;
  if (drone.fixed) return false;

  if (!POSSIBLE_MOVES[order]) return false;

  const position = [
    drone.position[0] + POSSIBLE_MOVES[order][0],
    drone.position[1] + POSSIBLE_MOVES[order][1],
  ];

  const hex = state.board[position[0]][position[1]];
  const allowedMoves = [
    BUMBLEBOTS_SPACE_EMPTY,
    BUMBLEBOTS_SPACE_TARGET,
    state.territory[name],
  ];
  if (!allowedMoves.includes(hex)) return false;

  return true;
}

export function sanitiseOrdersUpdate(state, { name, orders }) {
  return _.pick(orders, (order, droneId) =>
    validateDroneOrder(state, name, order, droneId)
  );
}

export function resolveDroneMoves(size, drones, orders) {
  // Construct arrays of the bots' current positions and the positions to
  // which they are trying to move.
  const currentPositions = _.times(size, () => []);
  const intendedPositions = _.times(size, () => _.times(size, () => []));

  _.each(drones, (dronesByBot, name) => {
    _.each(dronesByBot, ({ position: [i, j] }, droneId ) => {
      const drone = drones[name][droneId];
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
  });

  // Stop two or more drones if they are trying to move into the same hex.
  _.each(intendedPositions, (row, i) => {
    _.each(row, (botsInHex, j) => {
      if (botsInHex.length > 1) {
        _.each(botsInHex, drone => {
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
      ...drones[name][droneId],
      position: moveTo,
    };
  });
  return merge.recursive(true, drones, newDrones);
}
