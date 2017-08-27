import _ from 'underscore';

import * as bumblebots from '.';
import * as orders from './orders';
import * as utils from './utils';
import { BUMBLEBOTS_TICK } from './consts';
import { initialState } from './testUtils';

describe('Bumblebots orders', () => {
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

    it('allows moves into a target', () => {
      const state = {
        ...initialState,
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
          BotOne: {
            A: { position: [5, 5] },
          },
          BotTwo: {
            Z: { position: [2, 4] },
          },
        },
      };

      let update;
      update = { name: 'BotOne', orders: { A: 'UL' }};
      expect(orders.sanitiseOrdersUpdate(state, update)).toEqual({ A: 'UL' });
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

  describe('resolving drone moves', () => {
    const update = { type: BUMBLEBOTS_TICK, turnNumber: 1 };

    it('moves the drones around', () => {
      const state1 = {
        ...initialState,
        drones: {
          BotOne: {
            A: { position: [7, 7] },
            B: { position: [2, 7] },
          },
          BotTwo: {
            Z: { position: [8, 7] },
          },
        },
      };
      const orders1 = {
        BotOne: { A: 'UL' },
        BotTwo: { Z: 'R' },
      };

      const reduced = bumblebots.reducer(
        { state: state1, orders: orders1 }, update
      );
      const { state: state2, orders: orders2 } = reduced;
      expect(orders2).toEqual({});
      expect(
        _.omit(state1, 'drones', 'turnNumber', 'turns')
      ).toEqual(
        _.omit(state2, 'drones', 'turnNumber', 'turns')
      );
      expect(state2.turnNumber).toEqual(state1.turnNumber + 1);

      expect(state2.drones).toEqual({
        BotOne: {
          A: { position: [6, 6] },
          B: { position: [2, 7] },
        },
        BotTwo: {
          Z: { position: [8, 8] },
        },
      });
    });

    it('stops drones moving into the same space', () => {
      const state1 = {
        ...initialState,
        drones: {
          BotOne: {
            A: { position: [7, 7] },
          },
          BotTwo: {
            Z: { position: [9, 7] },
          },
        },
      };
      const orders1 = {
        BotOne: { A: 'DL' },
        BotTwo: { Z: 'UR' },
      };

      const { state: state2 } = bumblebots.reducer(
        { state: state1, orders: orders1 }, update
      );

      expect(state2.drones).toEqual({
        BotOne: { A: { position: [7, 7] } },
        BotTwo: { Z: { position: [9, 7] } },
      });
    });

    it('stops drones moving into a stopped drone', () => {
      const state1 = {
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
      const orders1 = {
        BotTwo: { Z: 'UR' },
      };

      const { state: state2 } = bumblebots.reducer(
        { state: state1, orders: orders1 }, update
      );

      expect(state2.drones).toEqual({
        BotOne: { A: { position: [7, 7] } },
        BotTwo: { Z: { position: [8, 7] } },
      });
    });

    it('allows drones to move in a line', () => {
      const state1 = {
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
      const orders1 = {
        BotOne: { A: 'UR' },
        BotTwo: { Z: 'UR' },
      };

      const { state: state2 } = bumblebots.reducer(
        { state: state1, orders: orders1 }, update
      );

      expect(state2.drones).toEqual({
        BotOne: { A: { position: [6, 7] } },
        BotTwo: { Z: { position: [7, 7] } },
      });
    });

    it('allows a conga line of drones', () => {
      const state1 = {
        ...initialState,
        drones: {
          BotOne: {
            A: { position: [7, 7] },
            B: { position: [6, 7] },
            C: { position: [6, 8] },
            D: { position: [6, 9] },
            E: { position: [7, 10] },
          },
          BotTwo: {},
        },
      };
      const orders1 = {
        BotOne: {
          A: 'UR',
          B: 'R',
          C: 'R',
          D: 'DR',
          E: 'DL',
        },
      };

      const { state: state2 } = bumblebots.reducer(
        { state: state1, orders: orders1 }, update
      );

      expect(state2.drones).toEqual({
        BotOne: {
          A: { position: [6, 7] },
          B: { position: [6, 8] },
          C: { position: [6, 9] },
          D: { position: [7, 10] },
          E: { position: [8, 10] },
        },
        BotTwo: {},
      });
    });

    it('blocks a conga line of drones if one of them does not move', () => {
      const state1 = {
        ...initialState,
        drones: {
          BotOne: {
            A: { position: [7, 7] },
            B: { position: [6, 7] },
            C: { position: [6, 8] },
            D: { position: [6, 9] },
            E: { position: [7, 10] },
          },
          BotTwo: {},
        },
      };
      const orders1 = {
        BotOne: {
          A: 'UR',
          B: 'R',
          C: 'R',
          D: 'DR',
        },
      };

      const { state: state2 } = bumblebots.reducer(
        { state: state1, orders: orders1 }, update
      );

      expect(state2.drones).toEqual({
        BotOne: {
          A: { position: [7, 7] },
          B: { position: [6, 7] },
          C: { position: [6, 8] },
          D: { position: [6, 9] },
          E: { position: [7, 10] },
        },
        BotTwo: {},
      });
    });

    it('blocks half a conga line of drones if one of them does not move', () => {
      const state1 = {
        ...initialState,
        drones: {
          BotOne: {
            A: { position: [7, 7] },
            B: { position: [6, 7] },
            C: { position: [6, 8] },
            D: { position: [6, 9] },
            E: { position: [7, 10] },
          },
          BotTwo: {},
        },
      };
      const orders1 = {
        BotOne: {
          A: 'UR',
          B: 'R',
          D: 'DR',
          E: 'DL',
        },
      };

      const { state: state2 } = bumblebots.reducer(
        { state: state1, orders: orders1 }, update
      );

      expect(state2.drones).toEqual({
        BotOne: {
          A: { position: [7, 7] },
          B: { position: [6, 7] },
          C: { position: [6, 8] },
          D: { position: [7, 10] },
          E: { position: [8, 10] },
        },
        BotTwo: {},
      });
    });

    it('allows bots to move in a cycle', () => {
      const state1 = {
        ...initialState,
        drones: {
          BotOne: {
            A: { position: [7, 7] },
            B: { position: [6, 7] },
            C: { position: [6, 8] },
            D: { position: [7, 9] },
            E: { position: [8, 9] },
            F: { position: [8, 8] },
          },
          BotTwo: {},
        },
      };
      const orders1 = {
        BotOne: {
          A: 'UR',
          B: 'R',
          C: 'DR',
          D: 'DL',
          E: 'L',
          F: 'UL',
        },
      };

      const { state: state2 } = bumblebots.reducer(
        { state: state1, orders: orders1 }, update
      );

      expect(state2.drones).toEqual({
        BotOne: {
          A: { position: [6, 7] },
          B: { position: [6, 8] },
          C: { position: [7, 9] },
          D: { position: [8, 9] },
          E: { position: [8, 8] },
          F: { position: [7, 7] },
        },
        BotTwo: {},
      });
    });

    it('does not allow two bots to swap places', () => {
      const state1 = {
        ...initialState,
        drones: {
          BotOne: {
            A: { position: [6, 7] },
          },
          BotTwo: {
            Z: { position: [7, 7] },
          },
        },
      };
      const orders1 = {
        BotOne: {
          A: 'DL',
        },
        BotTwo: {
          Z: 'UR',
        },
      };

      const { state: state2 } = bumblebots.reducer(
        { state: state1, orders: orders1 }, update
      );

      expect(state2.drones).toEqual({
        BotOne: {
          A: { position: [6, 7] },
        },
        BotTwo: {
          Z: { position: [7, 7] },
        },
      });
    });
  });  
});
