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

function generateGoodName(existingNames) {
  const name = randomChoice(GOOD_ADJECTIVES) + randomChoice(NAMES);
  if (existingNames && existingNames.includes(name)) {
    return generateName(existingNames);
  }
  return name;
}

function generateBadName(existingNames) {
  const name = randomChoice(BAD_ADJECTIVES) + randomChoice(NAMES);
  if (existingNames && existingNames.includes(name)) {
    return generateName(existingNames);
  }
  return name;
}

export function getDroneNames(maxDrones) {
  const droneNames = [[], []];
  for (let i = 0; i < maxDrones; i++) {
    const name = generateGoodName(droneNames[0]);
    droneNames[0].push(name);
  }
  for (let i = 0; i < maxDrones; i++) {
    const name = generateBadName(droneNames[1]);
    droneNames[1].push(name);
  }
  return droneNames;
}
