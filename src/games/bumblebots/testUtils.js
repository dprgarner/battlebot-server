import * as utils from './utils';

export const initialState = {
  bots: ['BotOne', 'BotTwo'],
  board: utils.parseHexBoard(`
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
    BotOne: utils.BUMBLEBOTS_SPACE_CLAIMED_0,
    BotTwo: utils.BUMBLEBOTS_SPACE_CLAIMED_1,
  },
  score: {
    BotOne: 0,
    BotTwo: 0,
  },
  result: null,
  turnNumber: 0,
  turns: [],
};
