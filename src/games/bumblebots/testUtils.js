import { parseHexBoard } from './utils';

import { BUMBLEBOTS_SPACE_CLAIMED_0, BUMBLEBOTS_SPACE_CLAIMED_1 } from './consts';

export const initialState = {
  bots: ['BotOne', 'BotTwo'],
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
    BotOne: {},
    BotTwo: {},
  },
  territory: {
    BotOne: BUMBLEBOTS_SPACE_CLAIMED_0,
    BotTwo: BUMBLEBOTS_SPACE_CLAIMED_1,
  },
  score: {
    BotOne: 0,
    BotTwo: 0,
  },

  result: null,
  turnNumber: 0,
  turns: [],
  droneNames: [[], []],
  spawnDue: {
    BotOne: [],
    BotTwo: [],
  },
  spawnPoints: {
    BotOne: [[1, 3], [1, 4], [1, 5]],
    BotTwo: [[13, 9], [13, 10], [13, 11]],
  },
  connected: ['BotOne', 'BotTwo'],
};
