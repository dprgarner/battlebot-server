import _ from 'underscore';

import * as bumblebots from '.';
import * as orders from './orders';
import * as utils from './utils';
import { SOCKET_INCOMING } from '../../const';

const initialState = {
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

describe('Bumblebots (general)', () => {
  describe('parsing', () => {
    beforeAll(() => {
      // Sanity check.
      expect(utils.BUMBLEBOTS_SPACE_CLAIMED_0).toEqual(5)
      expect(utils.BUMBLEBOTS_SPACE_CLAIMED_1).toEqual(6)
    });

    it('parses string-boards to int-boards', () => {

      const parsedBoard = utils.parseHexBoard(`
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
        [1, 0, 0, 5, 5, 5, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1],
        [1, 0, 0, 1, 2, 0, 0, 0, 1, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
        [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 1],
        [ , 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
        [ ,  , 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [ ,  ,  , 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1],
        [ ,  ,  ,  , 1, 2, 0, 1, 1, 0, 1, 1, 0, 0, 1],
        [ ,  ,  ,  ,  , 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [ ,  ,  ,  ,  ,  , 1, 0, 0, 6, 6, 6, 0, 0, 1],
        [ ,  ,  ,  ,  ,  ,  , 1, 1, 1, 1, 1, 1, 1, 1],
      ]);
    });

    it('renders int-boards as strings', () => {
      const renderedBoard = utils.renderHexBoard([
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 5, 5, 5, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1],
        [1, 0, 0, 1, 2, 0, 0, 0, 1, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
        [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 1],
        [ , 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
        [ ,  , 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [ ,  ,  , 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1],
        [ ,  ,  ,  , 1, 2, 0, 1, 1, 0, 1, 1, 0, 0, 1],
        [ ,  ,  ,  ,  , 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [ ,  ,  ,  ,  ,  , 1, 0, 0, 6, 6, 6, 0, 0, 1],
        [ ,  ,  ,  ,  ,  ,  , 1, 1, 1, 1, 1, 1, 1, 1],
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
      expect(orders.sanitiseOrdersUpdate(state, update))
        .toEqual(update.orders);

      update = { name: 'BotOne', orders: { A: 'DR' } };
      expect(orders.sanitiseOrdersUpdate(state, update))
        .toEqual(update.orders);

      update = { name: 'BotOne', orders: { A: 'L' } };
      expect(orders.sanitiseOrdersUpdate(state, update))
        .toEqual(update.orders);

      update = { name: 'BotOne', orders: { A: 'R' } };
      expect(orders.sanitiseOrdersUpdate(state, update))
        .toEqual(update.orders);

      update = { name: 'BotTwo', orders: { Z: 'UL' } };
      expect(orders.sanitiseOrdersUpdate(state, update))
        .toEqual(update.orders);

      update = { name: 'BotTwo', orders: { Z: 'UR' } };
      expect(orders.sanitiseOrdersUpdate(state, update))
        .toEqual(update.orders);

      update = { name: 'BotTwo', orders: { Z: 'L' } };
      expect(orders.sanitiseOrdersUpdate(state, update))
        .toEqual(update.orders);

      update = { name: 'BotTwo', orders: { Z: 'R' } };
      expect(orders.sanitiseOrdersUpdate(state, update))
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
      expect(orders.sanitiseOrdersUpdate(state, update)).toEqual({});
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
      expect(orders.sanitiseOrdersUpdate(state, update)).toEqual({});
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
      expect(orders.sanitiseOrdersUpdate(state, update)).toEqual({});

      update = { name: 'BotOne', orders: { B: 'UL' } };
      expect(orders.sanitiseOrdersUpdate(state, update)).toEqual({});

      update = { name: 'BotOne', orders: { B: 'L' } };
      expect(orders.sanitiseOrdersUpdate(state, update)).toEqual({});

      update = { name: 'BotOne', orders: { B: 'DL' } };
      expect(orders.sanitiseOrdersUpdate(state, update)).toEqual({});

      update = { name: 'BotTwo', orders: { Z: 'D' } };
      expect(orders.sanitiseOrdersUpdate(state, update)).toEqual({});
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
      expect(orders.sanitiseOrdersUpdate(state, update)).toEqual({});

      update = { name: 'BotOne', orders: { Z: 'UR' }};
      expect(orders.sanitiseOrdersUpdate(state, update)).toEqual({});
    });
  });

  describe('createOutgoing', () => {
    it('returns a representation of the full state to each bot', () => {
      const state = {
        ...initialState,
        drones: {
          BotOne: { A: [7, 7] },
          BotTwo: { Z: [8, 7] },
        },
      };
      expect(bumblebots.createOutgoing(state)).toEqual({
        BotOne: _.omit(state, 'turns'),
        BotTwo: _.omit(state, 'turns'),
      });
    });
  });
});
