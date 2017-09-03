import fs from 'fs';
import path from 'path';

import _ from 'underscore';
import clone from 'clone';

import * as consts from './consts';

function randomChoice(arr) {
  if (arr && arr.length) return arr[Math.floor(Math.random() * arr.length)];
}

//
// Target-generation
//
export function getPotentialTargets(board, drones) {
  const sites = [];
  const size = board.length;

  board = clone(board);
  _.each(drones, (dronesByName, name) => {
    _.each(dronesByName, ({ position }, droneId) => {
      board[position[0]][position[1]] = -1;
    });
  });

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (board[i][j] === consts.BUMBLEBOTS_SPACE_EMPTY) {
        sites.push([i, j]);
      }
    }
  }

  return sites;
}

export function generateTargetEvent(state) {
  const { turnNumber, board } = state;
  if (
    turnNumber > consts.BUMBLEBOTS_SETUP_TIME &&
    turnNumber < (consts.BUMBLEBOTS_TURN_LIMIT - consts.BUMBLEBOTS_COOLDOWN_TIME)
  ) {
    // Generate a new target, if there is space.
    if (Math.random() < consts.BUMBLEBOTS_TARGET_PROBABILITY) {
      const sites = getPotentialTargets(state.board, state.drones);
      return randomChoice(sites);
    }
  }
}

export function getPotentialSpawns(spawnPoints, drones) {
  const droneLocations = [];
  _.each(drones, (dronesByName, name) => {
    _.each(dronesByName, ({ position }, droneId) => {
      droneLocations.push(position);
    });
  });

  const sites = _.filter(spawnPoints, ([x, y]) => {
    return !_.any(droneLocations, ([dx, dy]) => x === dx && y === dy);
  });
  return sites;
}

export function generateDroneEvents(state) {
  const events = [];
  _.each(state.spawnDue, (spawnsDue, name) => {
    // Check if there is a new drone due for this bot.
    if (!spawnsDue.length || spawnsDue[0] > state.turnNumber) return;

    // Look for a space which is not occupied by a drone.
    const sites = getPotentialSpawns(state.spawnPoints[name], state.drones);
    if (sites.length) {
      const botIndex = state.bots.indexOf(name);
      const droneId = droneNameGenerators[botIndex](state.droneNames);

      events.push({
        name,
        droneId,
        position: randomChoice(sites),
      });
    };
  });
  return events;
}

//
// Drone names
//
const GOOD_ADJECTIVES = fs.readFileSync(
  path.join(__dirname, './goodAdjectives.txt'),
  'utf8',
).trim().split('\n');

const BAD_ADJECTIVES = fs.readFileSync(
  path.join(__dirname, './badAdjectives.txt'),
  'utf8',
).trim().split('\n');

const NAMES = fs.readFileSync(
  path.join(__dirname, './names.txt'),
  'utf8',
).trim().split('\n');

const droneNameGenerators = [
  (existingNames) => {
    const name = randomChoice(GOOD_ADJECTIVES) + randomChoice(NAMES);
    if (existingNames && existingNames.includes(name)) {
      return generateName(existingNames);
    }
    return name;
  },

  (existingNames) => {
    const name = randomChoice(BAD_ADJECTIVES) + randomChoice(NAMES);
    if (existingNames && existingNames.includes(name)) {
      return generateName(existingNames);
    }
    return name;
  },
];

export function getDroneNames(maxDrones) {
  const droneNames = [];
  for (let botIndex = 0; botIndex < 2; botIndex++) {
    droneNames.push([]);
    for (let droneIndex = 0; droneIndex < maxDrones; droneIndex++) {
      const name = droneNameGenerators[botIndex](droneNames);
      droneNames[botIndex].push(name);
    }
  }
  return droneNames;
}
