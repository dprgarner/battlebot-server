import * as random from './random'
import { parseHexBoard } from './utils';

describe('Bumblebots - random events', () => {
  let realMath;

  beforeAll(() => {
    // Sub out Math.random.
    realMath = global.Math;
    const mockMath = Object.create(global.Math);
    global.Math = mockMath;
  });

  afterAll(() => {
    global.Math = realMath;
  });

  describe('getPotentialTargets', () => {
    it('finds the allowed target sites', () => {
      const board = parseHexBoard(`
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
      const drones = {
        BotOne: { A: { position: [5, 6] } },
        BotTwo: { Z: { position: [7, 7] } },
      };
      const sites = random.getPotentialTargets(board, drones);
      expect(sites).toEqual([
        [1, 1], [1, 2], [1, 6], [1, 7],
        [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7], [2, 8],
        [3, 1], [3, 2], [3, 5], [3, 8], [3, 9],
        [4, 1], [4, 2], [4, 5], [4, 6], [4, 7], [4, 9], [4, 10],
        [5, 1], [5, 2], [5, 3], [5, 4], [5, 5], [5, 7], [5, 8], [5, 9], [5, 10], [5, 11],
        [6, 1], [6, 2], [6, 4], [6, 5], [6, 6], [6, 7], [6, 8], [6, 9], [6, 11], [6, 12],
        [7, 1], [7, 2], [7, 4], [7, 5], [7, 6], [7, 8], [7, 9], [7, 10], [7, 13],
        [8, 2], [8, 3], [8, 5], [8, 6], [8, 7], [8, 8], [8, 9], [8, 10], [8, 12], [8, 13],
        [9, 3], [9, 4], [9, 5], [9, 6], [9, 7], [9, 8], [9, 9], [9, 10], [9, 11], [9, 12], [9, 13],
        [10, 4], [10, 5], [10, 7], [10, 8], [10, 9], [10, 10], [10, 12], [10, 13],
        [11, 6], [11, 9], [11, 12], [11, 13],
        [12, 6], [12, 7], [12, 8], [12, 9], [12, 10], [12, 11], [12, 12], [12, 13],
        [13, 7], [13, 8], [13, 12], [13, 13]
      ]);
    });
  });

  it('generates a new target away from the edges of the board', () => {
      const board = parseHexBoard(`
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
      const drones = {
        BotOne: { A: { position: [5, 6] } },
        BotTwo: { Z: { position: [7, 7] } },
      };

    Math.random = jest.fn()
      .mockReturnValue(0.999)
      .mockReturnValueOnce(0.1);  // Target-spawn probability check

    const target = random.generateTargetEvent({ board, drones, turnNumber: 50 });
    expect(target).toEqual([13, 13]);
  });
});
