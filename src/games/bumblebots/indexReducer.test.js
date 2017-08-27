import _ from 'underscore';

import { SOCKET_INCOMING } from 'battlebots/const';

import * as bumblebots from '.';
import { parseHexBoard } from './utils';
import { initialState } from './testUtils';
import {
  BUMBLEBOTS_TICK,
  BUMBLEBOTS_TURN_LIMIT,
  BUMBLEBOTS_FULL_TIME,
} from './const';

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
      const board = parseHexBoard(`
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

    it('modifies the board, drone list, and score on reaching a target', () => {
      const state = {
        ...initialState,
        board: parseHexBoard(`
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
        `),
        drones: {
          BotOne: {
            A: { position: [5, 5] },
          },
          BotTwo: {
            Z: { position: [7, 7] },
          },
        },
        score: {
          BotOne: 2,
          BotTwo: 4,
        },
      };

      const update = { type: BUMBLEBOTS_TICK, turnNumber: 1 };
      const reduced = bumblebots.reducer({ state, orders: {} }, update);
      expect(reduced.state.drones).toEqual({
        BotOne: {},
        BotTwo: {
          Z: { position: [7, 7] },
        },
      });
      expect(reduced.state.score).toEqual({
        BotOne: 3,
        BotTwo: 4,
      });
      expect(reduced.state.board).toEqual(parseHexBoard(`
             # # # # # # # #
            # . . + + + . . #
           # . . . . . . . . #
          # . . # # . # # . . #
         # . . # + + . . # . . #
        # . . . + # + . . . . . #
       # . . # . + + . . . # . . #
      # . . # . . . . . . . # . . #
       # . . # . . . . . . # . . #
        # . . . . . . £ . . . . #
         # . . # . . . . # . . #
          # . . # # . # # . . #
           # . . . . . . . . #
            # . . x x x . . #
             # # # # # # # #
      `));
    });

    it('does not replace a wall with territory', () => {
      const state = {
        ...initialState,
        board: parseHexBoard(`
               # # # # # # # #
              # . . + + + . . #
             # . . . . . . . . #
            # . . # # . # # . . #
           # . . # £ . . . # . . #
          # . . . . . . . . . . . #
         # . . # . . . . . . # . . #
        # . . # . . . . . . . # . . #
         # . . # . . . . . . # . . #
          # . . . . . . £ . . . . #
           # . . # . . . . # . . #
            # . . # # . # # . . #
             # . . . . . . . . #
              # . . x x x . . #
               # # # # # # # #
        `),
        drones: {
          BotOne: {
            A: { position: [4, 4] },
          },
          BotTwo: {
            Z: { position: [7, 7] },
          },
        },
      };

      const update = { type: BUMBLEBOTS_TICK, turnNumber: 1 };
      const reduced = bumblebots.reducer({ state, orders: {} }, update);
      expect(reduced.state.board).toEqual(parseHexBoard(`
             # # # # # # # #
            # . . + + + . . #
           # . . . . . . . . #
          # . . # # . # # . . #
         # . . # # + . . # . . #
        # . . . + + . . . . . . #
       # . . # . . . . . . # . . #
      # . . # . . . . . . . # . . #
       # . . # . . . . . . # . . #
        # . . . . . . £ . . . . #
         # . . # . . . . # . . #
          # . . # # . # # . . #
           # . . . . . . . . #
            # . . x x x . . #
             # # # # # # # #
      `));
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
        type: BUMBLEBOTS_TICK,
        turnNumber: BUMBLEBOTS_TURN_LIMIT,
      };

      const reduced = bumblebots.reducer(
        { state: state1, orders: {} }, finalUpdate
      );
      const { state: state2, orders: orders2 } = reduced;
      expect(orders2).toEqual({});
      expect(BUMBLEBOTS_TURN_LIMIT).toBeDefined();
      expect(state2.turnNumber).toEqual(BUMBLEBOTS_TURN_LIMIT);
      expect(state2.result).toEqual({
        victor: null,
        reason: BUMBLEBOTS_FULL_TIME,
      });
    });

    it('declares the bot with the highest score the winner', () => {
      const finalUpdate = {
        type: BUMBLEBOTS_TICK,
        turnNumber: BUMBLEBOTS_TURN_LIMIT,
      };

      const state1 = {
        ...initialState,
        drones: {
          BotOne: {
            A: { position: [6, 7] },
          },
          BotTwo: {},
        },
        score: {
          BotOne: 4,
          BotTwo: 3,
        }
      };
      const reduced1 = bumblebots.reducer(
        { state: state1, orders: {} },
        finalUpdate,
      );
      expect(reduced1.state.result).toEqual({
        victor: 'BotOne',
        reason: BUMBLEBOTS_FULL_TIME,
      });

      const state2 = {
        ...initialState,
        drones: {
          BotOne: {
            A: { position: [6, 7] },
          },
          BotTwo: {},
        },
        score: {
          BotOne: 3,
          BotTwo: 4,
        }
      };
      const reduced2 = bumblebots.reducer(
        { state: state2, orders: {} },
        finalUpdate,
      );
      expect(reduced2.state.result).toEqual({
        victor: 'BotTwo',
        reason: BUMBLEBOTS_FULL_TIME,
      });
    });
  });
});
