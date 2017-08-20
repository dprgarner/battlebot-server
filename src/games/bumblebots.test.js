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

  describe('validator', () => {
    it('returns true if the move is valid', () => {
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

      expect(
        bumblebots.validator(state, { name: 'BotOne', A: 'UP' })
      ).toBeTruthy();
      expect(
        bumblebots.validator(state, { name: 'BotOne', A: 'DOWN' })
      ).toBeTruthy();
      expect(
        bumblebots.validator(state, { name: 'BotOne', A: 'LEFT' })
      ).toBeTruthy();
      expect(
        bumblebots.validator(state, { name: 'BotOne', A: 'RIGHT' })
      ).toBeTruthy();
      expect(
        bumblebots.validator(state, { name: 'BotTwo', Z: 'DOWN' })
      ).toBeTruthy();
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
      const turn = { name: 'BotOne', orders: { Z: 'UP' } };

      expect(bumblebots.validator(state, turn)).toBeFalsy();
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
      const turn = { name: 'BotOne', orders: { A: 'ASDF' } };

      expect(bumblebots.validator(state, turn)).toBeFalsy();
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
      const turn = { name: 'BotOne', orders: { A: 'UP' } };

      expect(bumblebots.validator(state, {
        name: 'BotOne', orders: { A: 'UP' }
      })).toBeFalsy();
      expect(bumblebots.validator(state, {
        name: 'BotOne', orders: { B: 'DOWN' }
      })).toBeFalsy();
      expect(bumblebots.validator(state, {
        name: 'BotOne', orders: { C: 'LEFT' }
      })).toBeFalsy();
      expect(bumblebots.validator(state, {
        name: 'BotOne', orders: { D: 'RIGHT' }
      })).toBeFalsy();
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
      const turn = { name: 'BotOne', orders: { A: 'UP' } };

      expect(bumblebots.validator(state, {
        name: 'BotOne', orders: { A: 'DOWN' }
      })).toBeFalsy();
      expect(bumblebots.validator(state, {
        name: 'BotOne', orders: { B: 'DOWN' }
      })).toBeFalsy();
      expect(bumblebots.validator(state, {
        name: 'BotTwo', orders: { Z: 'UP' }
      })).toBeFalsy();
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
        orders: { A: 'UP' },
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
  });
});