import _ from 'underscore';

import * as bumblebots from './bumblebots';
import { SOCKET_INCOMING } from '../const';

const initialState = {
  bots: ['BotOne', 'BotTwo'],
  board: bumblebots.parseHexBoard(`
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
    BotOne: 3,
    BotTwo: 4,
  },
  collected: {
    BotOne: 0,
    BotTwo: 0,
  },
  result: null,
  turnNumber: 0,
  turns: [],
};

describe('Bumblebots (general)', () => {
  describe('parsing', () => {
    it('parses string-boards to int-boards', () => {
      const parsedBoard = bumblebots.parseHexBoard(`
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
      `);

      expect(parsedBoard).toEqual([
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 3, 3, 3, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1],
        [1, 0, 0, 1, 2, 0, 0, 0, 1, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
        [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 1],
        [0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1],
        [0, 0, 0, 0, 1, 2, 0, 1, 1, 0, 1, 1, 0, 0, 1],
        [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 4, 4, 4, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
      ]);
    });

    it('renders int-boards as strings', () => {
      const renderedBoard = bumblebots.renderHexBoard([
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 3, 3, 3, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1],
        [1, 0, 0, 1, 2, 0, 0, 0, 1, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
        [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 1],
        [0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1],
        [0, 0, 0, 0, 1, 2, 0, 1, 1, 0, 1, 1, 0, 0, 1],
        [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 4, 4, 4, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
      ]);
      const stringBoard = (
`
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
`
      );
      expect(renderedBoard).toEqual(stringBoard);
    });
  });

  describe('sanitising orders', () => {
    it('allows valid moves', () => {
      const state = {
        ...initialState,
        drones: {
          BotOne: {
            A: { position: [1, 4] },
          },
          BotTwo: {
            Z: { position: [13, 10] },
          },
        },
      };

      let update;

      update = { name: 'BotOne', orders: { A: 'DL' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update))
        .toEqual(update.orders);

      update = { name: 'BotOne', orders: { A: 'DR' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update))
        .toEqual(update.orders);

      update = { name: 'BotOne', orders: { A: 'L' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update))
        .toEqual(update.orders);

      update = { name: 'BotOne', orders: { A: 'R' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update))
        .toEqual(update.orders);

      update = { name: 'BotTwo', orders: { Z: 'UL' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update))
        .toEqual(update.orders);

      update = { name: 'BotTwo', orders: { Z: 'UR' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update))
        .toEqual(update.orders);

      update = { name: 'BotTwo', orders: { Z: 'L' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update))
        .toEqual(update.orders);

      update = { name: 'BotTwo', orders: { Z: 'R' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update))
        .toEqual(update.orders);
    });

    it('returns false if trying to move another bot\'s drones', () => {
      const state = {
        ...initialState,
        drones: {
          BotOne: {
            A: { position: [7, 7] },
          },
          BotTwo: {
            Z: { position: [8, 7] },
          },
        },
      };
      const update = { name: 'BotOne', orders: { Z: 'R' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update)).toEqual({});
    });

    it('returns false if inputting a string which is not a direction', () => {
      const state = {
        ...initialState,
        drones: {
          BotOne: {
            A: { position: [7, 7] },
          },
          BotTwo: {
            Z: { position: [8, 7] },
          },
        },
      };
      const update = { name: 'BotOne', orders: { A: 'ASDF' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update)).toEqual({});
    });

    it('returns false if moving into an invalid hex', () => {
      const state = {
        ...initialState,
        drones: {
          BotOne: {
            A: { position: [1, 4] },
            B: { position: [7, 4] },
          },
          BotTwo: {
            Z: { position: [13, 10] },
          },
        },
      };

      let update;
      update = { name: 'BotOne', orders: { A: 'U' }};
      expect(bumblebots.sanitiseOrdersUpdate(state, update)).toEqual({});

      update = { name: 'BotOne', orders: { B: 'UL' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update)).toEqual({});

      update = { name: 'BotOne', orders: { B: 'L' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update)).toEqual({});

      update = { name: 'BotOne', orders: { B: 'DL' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update)).toEqual({});

      update = { name: 'BotTwo', orders: { Z: 'D' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update)).toEqual({});
    });
  });

  it('returns false if moving into a claimed area', () => {
    const state = {
      ...initialState,
      drones: {
        BotOne: {
          A: { position: [12, 10] },
        },
        BotTwo: {
          Z: { position: [2, 4] },
        },
      },
    };

    let update;
    update = { name: 'BotOne', orders: { A: 'DL' }};
    expect(bumblebots.sanitiseOrdersUpdate(state, update)).toEqual({});

    update = { name: 'BotOne', orders: { Z: 'UR' }};
    expect(bumblebots.sanitiseOrdersUpdate(state, update)).toEqual({});
  });
});
