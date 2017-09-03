import _ from 'underscore';

import {
  BUMBLEBOTS_SPACE_EMPTY,
  BUMBLEBOTS_SPACE_WALL,
  BUMBLEBOTS_SPACE_TARGET,
  BUMBLEBOTS_SPACE_CLAIMED_0,
  BUMBLEBOTS_SPACE_CLAIMED_1,
} from './consts';

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
