import _ from 'underscore';

import * as bumblebots from './bumblebots';
import { SOCKET_INCOMING } from '../const';

const initialState = {
  bots: ['BotOne', 'BotTwo'],
  board: bumblebots.parseBoard(`
    . . . . . + + + + + . . . . .
    . . . . . . + + + . . . . . .
    . . # # # . . . . . # # # . .
    . . # . . . . . . . . . # . .
    . . # . . . . . . . . . # . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . .
    . . # . . . . . . . . . # . .
    . . # . . . . . . . . . # . .
    . . # # # . . . . . # # # . .
    . . . . . . x x x . . . . . .
    . . . . . x x x x x . . . . .
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
        orders: { A: 'UP' },
      };

      const reduced = bumblebots.reducer({ state: state1, orders: {} }, update);
      const { state: state2, orders, outgoing } = reduced;
      expect(state1).toEqual(state2);
      expect(outgoing).toEqual({});
      expect(orders).toEqual({ BotOne: { A: 'UP' } });
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
      const orders1 = { BotOne: { A: 'UP' } };
      const update = {
        type: SOCKET_INCOMING,
        name: 'BotTwo',
        orders: { Z: 'DOWN' },
      };

      const reduced = bumblebots.reducer(
        { state: state1, orders: orders1 }, update
      );
      const { state: state2, orders: orders2, outgoing } = reduced;
      expect(state1).toEqual(state2);
      expect(outgoing).toEqual({});
      expect(orders2).toEqual({
        BotOne: { A: 'UP' },
        BotTwo: { Z: 'DOWN' },
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
        orders: { A: 'DOWN', B: 'WHAT' },
      };

      const reduced = bumblebots.reducer({ state: state1, orders: {} }, update);
      const { state: state2, orders, outgoing } = reduced;
      expect(state1).toEqual(state2);
      expect(outgoing).toEqual({});
      expect(orders).toEqual({ BotOne: { A: 'DOWN' } });
    });
  });

  describe('resolving drone moves', () => {
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
        BotOne: { A: 'UP' },
        BotTwo: { Z: 'RIGHT' },
      };
      const update = { type: bumblebots.BUMBLEBOTS_TICK, number: 0 };

      const reduced = bumblebots.reducer(
        { state: state1, orders: orders1 }, update
      );
      const { state: state2, orders: orders2 } = reduced;
      expect(orders2).toEqual({});
      expect(_.omit(state1, 'drones')).toEqual(_.omit(state2, 'drones'));

      expect(state2.drones).toEqual({
        BotOne: {
          A: { position: [6, 7] },
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
        BotOne: { A: 'DOWN' },
        BotTwo: { Z: 'UP' },
      };
      const update = { type: bumblebots.BUMBLEBOTS_TICK, number: 0 };

      const reduced = bumblebots.reducer(
        { state: state1, orders: orders1 }, update
      );
      const { state: state2, orders: orders2 } = reduced;
      expect(orders2).toEqual({});
      expect(_.omit(state1, 'drones')).toEqual(_.omit(state2, 'drones'));

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
        BotTwo: { Z: 'UP' },
      };
      const update = { type: bumblebots.BUMBLEBOTS_TICK, number: 0 };

      const reduced = bumblebots.reducer(
        { state: state1, orders: orders1 }, update
      );
      const { state: state2, orders: orders2 } = reduced;
      expect(orders2).toEqual({});
      expect(_.omit(state1, 'drones')).toEqual(_.omit(state2, 'drones'));

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
        BotOne: { A: 'UP' },
        BotTwo: { Z: 'UP' },
      };
      const update = { type: bumblebots.BUMBLEBOTS_TICK, number: 0 };

      const reduced = bumblebots.reducer(
        { state: state1, orders: orders1 }, update
      );
      const { state: state2, orders: orders2 } = reduced;
      expect(orders2).toEqual({});
      expect(_.omit(state1, 'drones')).toEqual(_.omit(state2, 'drones'));

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
            E: { position: [7, 9] },
          },
          BotTwo: {},
        },
      };
      const orders1 = {
        BotOne: {
          A: 'UP',
          B: 'RIGHT',
          C: 'RIGHT',
          D: 'DOWN',
          E: 'DOWN',
        },
      };
      const update = { type: bumblebots.BUMBLEBOTS_TICK, number: 0 };

      const reduced = bumblebots.reducer(
        { state: state1, orders: orders1 }, update
      );
      const { state: state2, orders: orders2 } = reduced;
      expect(orders2).toEqual({});
      expect(_.omit(state1, 'drones')).toEqual(_.omit(state2, 'drones'));

      expect(state2.drones).toEqual({
        BotOne: {
          A: { position: [6, 7] },
          B: { position: [6, 8] },
          C: { position: [6, 9] },
          D: { position: [7, 9] },
          E: { position: [8, 9] },
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
            E: { position: [7, 9] },
          },
          BotTwo: {},
        },
      };
      const orders1 = {
        BotOne: {
          A: 'UP',
          B: 'RIGHT',
          C: 'RIGHT',
          D: 'DOWN',
        },
      };
      const update = { type: bumblebots.BUMBLEBOTS_TICK, number: 0 };

      const reduced = bumblebots.reducer(
        { state: state1, orders: orders1 }, update
      );
      const { state: state2, orders: orders2 } = reduced;
      expect(orders2).toEqual({});
      expect(_.omit(state1, 'drones')).toEqual(_.omit(state2, 'drones'));

      expect(state2.drones).toEqual({
        BotOne: {
          A: { position: [7, 7] },
          B: { position: [6, 7] },
          C: { position: [6, 8] },
          D: { position: [6, 9] },
          E: { position: [7, 9] },
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
            E: { position: [7, 9] },
          },
          BotTwo: {},
        },
      };
      const orders1 = {
        BotOne: {
          A: 'UP',
          B: 'RIGHT',
          C: 'RIGHT',
          E: 'DOWN',
        },
      };
      const update = { type: bumblebots.BUMBLEBOTS_TICK, number: 0 };

      const reduced = bumblebots.reducer(
        { state: state1, orders: orders1 }, update
      );
      const { state: state2, orders: orders2 } = reduced;
      expect(orders2).toEqual({});
      expect(_.omit(state1, 'drones')).toEqual(_.omit(state2, 'drones'));

      expect(state2.drones).toEqual({
        BotOne: {
          A: { position: [7, 7] },
          B: { position: [6, 7] },
          C: { position: [6, 8] },
          D: { position: [6, 9] },
          E: { position: [8, 9] },
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
            C: { position: [6, 6] },
            D: { position: [7, 6] },
          },
          BotTwo: {},
        },
      };
      const orders1 = {
        BotOne: {
          A: 'UP',
          B: 'LEFT',
          C: 'DOWN',
          D: 'RIGHT',
        },
      };
      const update = { type: bumblebots.BUMBLEBOTS_TICK, number: 0 };

      const reduced = bumblebots.reducer(
        { state: state1, orders: orders1 }, update
      );
      const { state: state2, orders: orders2 } = reduced;
      expect(orders2).toEqual({});
      expect(_.omit(state1, 'drones')).toEqual(_.omit(state2, 'drones'));

      expect(state2.drones).toEqual({
        BotOne: {
          A: { position: [6, 7] },
          B: { position: [6, 6] },
          C: { position: [7, 6] },
          D: { position: [7, 7] },
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
          A: 'DOWN',
        },
        BotTwo: {
          Z: 'UP',
        },
      };
      const update = { type: bumblebots.BUMBLEBOTS_TICK, number: 0 };

      const reduced = bumblebots.reducer(
        { state: state1, orders: orders1 }, update
      );
      const { state: state2, orders: orders2 } = reduced;
      expect(orders2).toEqual({});
      expect(_.omit(state1, 'drones')).toEqual(_.omit(state2, 'drones'));

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
