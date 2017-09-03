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
  connected: ['BotOne', 'BotTwo'],
};
