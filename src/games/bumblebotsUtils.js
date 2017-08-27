import fs from 'fs';
import path from 'path';

import _ from 'underscore';

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

export const BUMBLEBOTS_SPACE_EMPTY = 0;
export const BUMBLEBOTS_SPACE_WALL = 1;
export const BUMBLEBOTS_SPACE_TARGET = 2;
export const BUMBLEBOTS_SPACE_CLAIMED_0 = 5;
export const BUMBLEBOTS_SPACE_CLAIMED_1 = 6;

const CHAR_TO_INT = {
  '.': BUMBLEBOTS_SPACE_EMPTY,
  '#': BUMBLEBOTS_SPACE_WALL,
  '£': BUMBLEBOTS_SPACE_TARGET,
  '+': BUMBLEBOTS_SPACE_CLAIMED_0,
  'x': BUMBLEBOTS_SPACE_CLAIMED_1,
};
const INT_TO_CHAR = _.invert(CHAR_TO_INT);

/*
The hexes on the board are specified uniquely by integer tuples (i, j). For
example, the hex at the centre of the board is (7, 7).

       *---j---> # # #
      / . . + + + . . #
     i . . . . . . . . #
    / . . . . . . . . . #
  |_ . . . . . . . . . . #
  # . . . . . . . . . . . #
 # . . . . . . . . . . . . #
# . . . . . . # . . . . . . #
 # . . . . . . . . . . . . #
  # . . . . . . . . . . . #
   # . . . . . . . . . . #
    # . . . . . . . . . #
     # . . . . . . . . #
      # . . x x x . . #
       # # # # # # # #
*/

export function parseHexBoard(str) {
  // Convert a string-representation of the board into a [[Int]]
  // representation.
  const collapsedRows = str.trim().split('\n').map(r => r.replace(/ /g, ''));
  const maxWidth = Math.max(...collapsedRows.map(r => r.length));
  for (let i = 0; i < collapsedRows.length; i++) {
    let addDots = i - (maxWidth - 1) / 2
    if (addDots > 0) {
      collapsedRows[i] = ' '.repeat(addDots) + collapsedRows[i];
    }
  }

  return collapsedRows.map(row => row.split('').map(c => CHAR_TO_INT[c]));
}

export function renderHexBoard(rows) {
  const stringRows = rows.map(row => {
    let str = '';
    for (let i = 0; i < row.length; i++) {
      if (row[i] || str) str += INT_TO_CHAR[row[i]] + ' ';
    }
    return str.trim();
  });
  const maxWidth = Math.max(...rows.map(r => r.length));
  for (let i = 0; i < stringRows.length; i++) {
    let addPadding = Math.abs((stringRows.length - 1) / 2 - i);
    stringRows[i] = ' '.repeat(addPadding) + stringRows[i];
  }
  return `\n${stringRows.join('\n')}\n`;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateGoodName(existingNames) {
  const name = randomChoice(GOOD_ADJECTIVES) + randomChoice(NAMES);
  if (existingNames && existingNames.includes(name)) {
    return generateName(existingNames);
  }
  return name;
}

export function generateBadName(existingNames) {
  const name = randomChoice(BAD_ADJECTIVES) + randomChoice(NAMES);
  if (existingNames && existingNames.includes(name)) {
    return generateName(existingNames);
  }
  return name;
}
