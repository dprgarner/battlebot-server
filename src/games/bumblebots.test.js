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
    BotOne: 2,
    BotTwo: 3,
  },
  collected: {
    BotOne: 0,
    BotTwo: 0,
  },
  result: null,
  turns: [],
};

describe('Bumblebots', () => {
  describe('parsing', () => {
    it('parses string-boards to int-boards', () => {
      const parsedBoard = bumblebots.parseBoard(`
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
      `);
      expect(parsedBoard).toEqual([
        [0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0],
      ]);
    });

    it('renders int-boards as strings', () => {
      const renderedBoard = bumblebots.renderBoard([
        [0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0],
      ]);
      const stringBoard = (
`
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
`
      );
      expect(renderedBoard).toEqual(stringBoard);
    });
  });

  describe('sanitiseOrdersUpdate', () => {
    it('allows valid moves', () => {
      const state = {
        ...initialState,
        drones: {
          BotOne: {
            A: { position: [2, 7] },
          },
          BotTwo: {
            Z: { position: [12, 7] },
          },
        },
      };

      let update;

      update = { name: 'BotOne', orders: { A: 'UP' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update))
        .toEqual(update.orders);

      update = { name: 'BotOne', orders: { A: 'DOWN' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update))
        .toEqual(update.orders);

      update = { name: 'BotOne', orders: { A: 'LEFT' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update))
        .toEqual(update.orders);

      update = { name: 'BotOne', orders: { A: 'RIGHT' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update))
        .toEqual(update.orders);

      update = { name: 'BotTwo', orders: { Z: 'UP' } };
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
      const update = { name: 'BotOne', orders: { Z: 'UP' } };
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

    it('returns false if attempting to leave the arena', () => {
      const state = {
        ...initialState,
        drones: {
          BotOne: {
            A: { position: [0, 7] },
            B: { position: [14, 7] },
            C: { position: [7, 0] },
            D: { position: [7, 14] },
          },
          BotTwo: {
            Z: { position: [8, 7] },
          },
        },
      };

      let update;
      update = { name: 'BotOne', orders:{ A: 'UP' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update)).toEqual({});

      update = { name: 'BotOne', orders:{ B: 'DOWN' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update)).toEqual({});

      update = { name: 'BotOne', orders:{ C: 'LEFT' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update)).toEqual({});

      update = { name: 'BotOne', orders:{ D: 'RIGHT' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update)).toEqual({});
    });

    it('returns false if moving into an invalid square', () => {
      const state = {
        ...initialState,
        drones: {
          BotOne: {
            A: { position: [1, 2] },
            B: { position: [12, 7] },
          },
          BotTwo: {
            Z: { position: [2, 7] },
          },
        },
      };

      let update;
      update = { name: 'BotOne', orders: { A: 'DOWN' }};
      expect(bumblebots.sanitiseOrdersUpdate(state, update)).toEqual({});

      update = { name: 'BotOne', orders: { B: 'DOWN' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update)).toEqual({});

      update = { name: 'BotTwo', orders: { Z: 'UP' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update)).toEqual({});

      update = { name: 'BotOne', orders:{ D: 'RIGHT' } };
      expect(bumblebots.sanitiseOrdersUpdate(state, update)).toEqual({});
    });
  });

  describe('reducer', () => {
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
});