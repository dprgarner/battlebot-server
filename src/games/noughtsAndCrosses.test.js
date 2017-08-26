import * as noughtsAndCrosses from './noughtsAndCrosses';

const midGameState = {
  bots: ['botA', 'botB'],
  waitingFor: ['botB'],
  result: null,
  board: [
      ['', '', 'X'],
      ['', 'X', ''],
      ['', 'O', ''],
  ],
  marks: {
    X: 'botA',
    O: 'botB',
  },
  invalidTurns: { botA: 0, botB: 0 },
  turns: [],
};

const endGameState = {
  bots: ['botA', 'botB'],
  waitingFor: ['botA'],
  result: null,
  board: [
      ['O', '', 'X'],
      ['X', 'X', 'O'],
      ['O', 'O', 'X'],
  ],
  marks: {
    X: 'botA',
    O: 'botB',
  },
  invalidTurns: { botA: 0, botB: 0 },
  turns: [],
};

describe('Noughts and Crosses', () => {
  it('sets the initial state with an initial bot', () => {
    const initialUpdate = noughtsAndCrosses.createInitialUpdate(
      ['botA', 'botB']
    );
    const initialState = initialUpdate.state;
    expect(initialState.board).toEqual([
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
    ]);
    expect(initialState.waitingFor).toEqual(['botA']);
    expect(initialState.bots).toEqual(['botA', 'botB']);
    expect(initialState.marks).toEqual({ X: 'botA', O: 'botB' });
  });

  describe('validator', () => {
    it('accepts valid moves', () => {
      const isValid = noughtsAndCrosses.validator(
        midGameState,
        { space: [2, 0], mark: 'O', name: 'botB' }
      );
      expect(isValid).toBeTruthy();
    });

    it('rejects the move if it is not a bot\'s turn', () => {
      const isValid = noughtsAndCrosses.validator(
        midGameState,
        { space: [2, 0], mark: 'X', name: 'botA' }
      );
      expect(isValid).toBeFalsy();
    });

    it('rejects the move if the bot is using the wrong mark', () => {
      const isValid = noughtsAndCrosses.validator(
        midGameState,
        { space: [2, 0], mark: 'X', name: 'botB' }
      );
      expect(isValid).toBeFalsy();
    });

    it('rejects the move if the bot is a nested mark', () => {
      const isValid = noughtsAndCrosses.validator(
        midGameState,
        { space: [2, 0], mark: ['O'], name: 'botB' }
      );
      expect(isValid).toBeFalsy();
    });

    it('rejects the move if the space is not a grid space', () => {
      [
        null,
        'the moon',
        [1, 2, 3],
        [0, 'a'],
        [-1, 1],
        [1, 3],
      ].forEach(space => {
        const isValid = noughtsAndCrosses.validator(
          midGameState,
          { space, mark: 'O', name: 'botB' }
        );
        expect(isValid).toBeFalsy();
      });
    });

    it('rejects the move if the space is taken', () => {
      [
        [0, 2],
        [1, 1],
        [2, 1],
      ].forEach(space => {
        const isValid = noughtsAndCrosses.validator(
          midGameState,
          { space, mark: 'O', name: 'botB' }
        );
        expect(isValid).toBeFalsy();
      });
    });
  });

  describe('validTurnReducer', () => {
    it('adds the mark to the space', () => {
      const newState = noughtsAndCrosses.validTurnReducer(
        midGameState,
        { space: [2, 0], mark: 'O', name: 'botB' }
      );

      expect(newState.board).toEqual([
        ['', '', 'X'],
        ['', 'X', ''],
        ['O', 'O', ''],
      ]);
    });

    it('flips the bot in waitingFor', () => {
      const newState = noughtsAndCrosses.validTurnReducer(
        midGameState,
        { space: [2, 0], mark: 'O', name: 'botB' }
      );
      expect(newState.bots).toEqual(midGameState.bots);
      expect(newState.waitingFor).toEqual(['botA']);
    });

    it('leaves result as falsy', () => {
      const newState = noughtsAndCrosses.validTurnReducer(
        midGameState,
        { space: [2, 0], mark: 'O', name: 'botB' }
      );
      expect(newState.result).toBeFalsy();
    });

    it('sets result if a bot wins', () => {
      const newState = noughtsAndCrosses.validTurnReducer(
        noughtsAndCrosses.validTurnReducer(
          midGameState,
          { space: [2, 2], mark: 'O', name: 'botB' }
        ),
        { space: [2, 0], mark: 'X', name: 'botA' }
      );
      expect(newState.result).toBeTruthy();
      expect(newState.result.victor).toEqual('botA');
      expect(newState.result.reason).toEqual('complete');
    });

    it('sets result when it is a draw', () => {
      const newState = noughtsAndCrosses.validTurnReducer(
        endGameState,
        { space: [0, 1], mark: 'X', name: 'botA' }
      );
      expect(newState.result).toBeTruthy();
      expect(newState.result.victor).toEqual(null);
      expect(newState.result.reason).toEqual('complete');
    });
  });

  describe('getVictor', () => {
    it('detects a winner', () => {
      expect(noughtsAndCrosses.getVictor([
        ['', '', 'X'],
        ['', 'X', ''],
        ['X', 'O', 'O'],
      ])).toEqual('X')

      expect(noughtsAndCrosses.getVictor([
        ['X', '', 'X'],
        ['', 'X', ''],
        ['O', 'O', 'O'],
      ])).toEqual('O')

      expect(noughtsAndCrosses.getVictor([
        ['', 'X', 'O'],
        ['', 'X', ''],
        ['O', 'X', 'O'],
      ])).toEqual('X')

      expect(noughtsAndCrosses.getVictor([
        ['', 'X', 'O'],
        ['', 'X', 'O'],
        ['X', '', 'O'],
      ])).toEqual('O')
    });

    it('detects a complete board', () => {
      expect(noughtsAndCrosses.getVictor([
        ['X', 'X', 'O'],
        ['O', 'O', 'X'],
        ['X', 'O', 'O'],
      ])).toEqual(-1)
    });
  });
});
