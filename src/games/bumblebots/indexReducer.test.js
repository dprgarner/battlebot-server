import _ from 'underscore';

import { SOCKET_INCOMING } from 'battlebots/const';

import * as bumblebots from '.';
import * as utils from './utils';
import { initialState } from './testUtils';

`
             # # # # # # # # # # # # # #
            # . . . . . + + + . . . . . #
           # . . . . . . + + . . . . . . #
          # . . . . . . . . . . . . . . . #
         # . . . . . . . . . . . . . . . . #
        # . . . . . . . . . . . . . . . . . #
       # . . . . . . . . . . . . . . . . . . #
      # . . . . . + C'. . . . * * . . . . . . #
     # . . . . . + # + . . . * # X'. C . . . . #
    # . . . . . . + A'. . . . Z'* . . . . . . . #
   # . . . . . . . . . . . . . . . . . . . . . . #
  # . . . . . . . . . . . . . + + . . . . B . . . #
 # + . . . . . . . . . . . . + # + . . . . . . . * #
# + + . . . . . . . . . . . . + + . . . . . . . * * #
 # + . . . . 0 0 . . . . . . O O . . . . . . . . * #
  # . . . . 0 # 0 . . . . . O # O . . . . . A . . #
   # . . . . 0 0 . . . . . . O O . . . . . . . . #
    # . . . . . . . . o o . . . . . 0 0 . . . . #
     # . . . . . . . o # o @ @ . . 0 # 0 . . . #
      # . . . . . . . o o @ # @ . . 0 0 . . . #
       # . . . . . . . . . @ @ . . . . . . . #
        # . . . . . . . . . . . . . . . . . #
         # . . . . . . . . . . . . . . . . #
          # . . . . . . . . . . . . . . . #
           # . . . . . . . . . . . . . . #
            # . . . . . * * * . . . . . #
             # # # # # # # # # # # # # #
`

describe('Bumblebots (reducer)', () => {
  describe('queuing orders', () => {
    it('queues up a valid order request', () => {
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
      const update = {
        type: SOCKET_INCOMING,
        name: 'BotOne',
        orders: { A: 'UL' },
      };

      const reduced = bumblebots.reducer({ state: state1, orders: {} }, update);
      const { state: state2, orders, outgoing } = reduced;
      expect(state1).toEqual(state2);
      expect(outgoing).toEqual({});
      expect(orders).toEqual({ BotOne: { A: 'UL' } });
    });

    it('ignores an invalid order request', () => {
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
      const update = {
        type: SOCKET_INCOMING,
        name: 'BotTwo',
        asdf: 'qqq',
      };

      const reduced = bumblebots.reducer({ state: state1, orders: {} }, update);
      const { state: state2, orders, outgoing } = reduced;
      expect(state1).toEqual(state2);
      expect(outgoing).toEqual({});
      expect(orders).toEqual({});
    });

    it('appends to existing order requests', () => {
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
      const orders1 = { BotOne: { A: 'UL' } };
      const update = {
        type: SOCKET_INCOMING,
        name: 'BotTwo',
        orders: { Z: 'DR' },
      };

      const reduced = bumblebots.reducer(
        { state: state1, orders: orders1 }, update
      );
      const { state: state2, orders: orders2, outgoing } = reduced;
      expect(state1).toEqual(state2);
      expect(outgoing).toEqual({});
      expect(orders2).toEqual({
        BotOne: { A: 'UL' },
        BotTwo: { Z: 'DR' },
      });
    });

    it('filters invalid orders in a well-formatted request', () => {
      const state1 = {
        ...initialState,
        drones: {
          BotOne: {
            A: { position: [7, 7] },
            B: { position: [9, 9] },
          },
          BotTwo: {
            Z: { position: [8, 7] },
          },
        },
      };
      const update = {
        type: SOCKET_INCOMING,
        name: 'BotOne',
        orders: { A: 'DR', B: 'WHAT' },
      };

      const reduced = bumblebots.reducer({ state: state1, orders: {} }, update);
      const { state: state2, orders, outgoing } = reduced;
      expect(state1).toEqual(state2);
      expect(outgoing).toEqual({});
      expect(orders).toEqual({ BotOne: { A: 'DR' } });
    });
  });

  describe('obtaining a target', () => {
    it('notes which bots have reached a target (flower)', () => {
      const board = utils.parseHexBoard(`
               # # # # # # # #
              # . . + + + . . #
             # . . . . . . . . #
            # . . # # . # # . . #
           # . . # . . . . # . . #
          # . . . . £ . . . . . . #
         # . . # . . . . . . # . . #
        # . . # . . . . . . . # . . #
         # . . # . . . . . . # . . #
          # . . . . . . £ . . . . #
           # . . # . . . . # . . #
            # . . # # . # # . . #
             # . . . . . . . . #
              # . . x x x . . #
               # # # # # # # #
      `);
      const drones = {
        BotOne: {
          A: { position: [5, 5] },
        },
        BotTwo: {
          Z: { position: [7, 7] },
        },
      };

      const resolved = bumblebots.resolveTargets(board, drones);
      expect(resolved).toEqual([
        { name: 'BotOne', droneId: 'A', position: [5, 5] },
      ]);
    });
  });

  describe('conclusion', () => {
    it('stops the game after BUMBLEBOTS_TURN_LIMIT turns', () => {
      const state1 = {
        ...initialState,
        drones: {
          BotOne: {
            A: { position: [6, 7] },
          },
          BotTwo: {},
        },
      };
      const finalUpdate = {
        type: bumblebots.BUMBLEBOTS_TICK,
        turnNumber: bumblebots.BUMBLEBOTS_TURN_LIMIT,
      };

      const reduced = bumblebots.reducer(
        { state: state1, orders: {} }, finalUpdate
      );
      const { state: state2, orders: orders2 } = reduced;
      expect(orders2).toEqual({});
      expect(bumblebots.BUMBLEBOTS_TURN_LIMIT).toBeDefined();
      expect(state2.turnNumber).toEqual(bumblebots.BUMBLEBOTS_TURN_LIMIT);
      expect(state2.result).toEqual({
        victor: null,
        reason: bumblebots.BUMBLEBOTS_FULL_TIME,
      });
    });
  });
});
