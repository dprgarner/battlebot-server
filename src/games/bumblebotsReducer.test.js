import _ from 'underscore';

import * as bumblebots from './bumblebots';
import * as bumblebotsUtils from './bumblebotsUtils';

import { SOCKET_INCOMING } from '../const';


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

const initialState = {
  bots: ['BotOne', 'BotTwo'],
  board: bumblebotsUtils.parseHexBoard(`
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
  score: {
    BotOne: 0,
    BotTwo: 0,
  },
  result: null,
  turnNumber: 0,
  turns: [],
};

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

  describe('resolving drone moves', () => {
    const update = { type: bumblebots.BUMBLEBOTS_TICK, turnNumber: 1 };

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
        _.omit(state1, 'drones', 'turnNumber')
      ).toEqual(
        _.omit(state2, 'drones', 'turnNumber')
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
