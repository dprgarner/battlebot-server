import * as bumblebots from './bumblebots';

describe.only('Bumblebots', () => {
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
    const board = bumblebots.parseBoard(`
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

    it('returns true if the move is valid', () => {
      const state = {
        bots: ['BotOne', 'BotTwo'],
        board,
        drones: {
          BotOne: {
            A: { position: [2, 7] },
          },
          BotTwo: {
            Z: { position: [12, 7] },
          },
        },
        territory: {
          BotOne: 2,
          BotTwo: 3,
        },
        orders: {},
        result: null,
        turns: [],
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
        bots: ['BotOne', 'BotTwo'],
        board,
        drones: {
          BotOne: {
            A: { position: [7, 7] },
          },
          BotTwo: {
            Z: { position: [8, 7] },
          },
        },
        territory: {
          BotOne: 2,
          BotTwo: 3,
        },
        orders: {},
        result: null,
        turns: [],
      };
      const turn = { name: 'BotOne', orders: { Z: 'UP' } };

      expect(bumblebots.validator(state, turn)).toBeFalsy();
    });

    it('returns false if inputting a string which is not a direction', () => {
      const state = {
        bots: ['BotOne', 'BotTwo'],
        board,
        drones: {
          BotOne: {
            A: { position: [7, 7] },
          },
          BotTwo: {
            Z: { position: [8, 7] },
          },
        },
        orders: {},
        result: null,
        turns: [],
      };
      const turn = { name: 'BotOne', orders: { A: 'ASDF' } };

      expect(bumblebots.validator(state, turn)).toBeFalsy();
    });

    it('returns false if attempting to leave the arena', () => {
      const state = {
        bots: ['BotOne', 'BotTwo'],
        board,
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
        territory: {
          BotOne: 2,
          BotTwo: 3,
        },
        orders: {},
        result: null,
        turns: [],
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
        bots: ['BotOne', 'BotTwo'],
        board,
        drones: {
          BotOne: {
            A: { position: [1, 2] },
            B: { position: [12, 7] },
          },
          BotTwo: {
            Z: { position: [2, 7] },
          },
        },
        territory: {
          BotOne: 2,
          BotTwo: 3,
        },
        orders: {},
        result: null,
        turns: [],
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
    const board = bumblebots.parseBoard(`
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

    // it('???', () => {
    //   const state = {
    //     bots: ['BotOne', 'BotTwo'],
    //     board,
    //     drones: {
    //       BotOne: {
    //         A: { position: [7, 7] },
    //       },
    //       BotTwo: {
    //         Z: { position: [8, 7] },
    //       },
    //     },
    //     orders: {},
    //     result: null,
    //     turns: [],
    //   };
    //   const turn = { name: 'BotOne', A: 'UP' };

    //   expect(bumblebots.validator(state, turn)).toBeTruthy();
    // });
  });
});