const noughtsAndCrosses = require('./noughtsandcrosses');

const midGameState = {
  players: ['botA', 'botB'],
  nextPlayer: 'botB',
  complete: false,
  board: [
      ['', '', 'X'],
      ['', 'X', ''],
      ['', 'O', ''],
  ],
  marks: {
    X: 'botA',
    O: 'botB',
  },
};

const endGameState = {
  players: ['botA', 'botB'],
  nextPlayer: 'botA',
  complete: false,
  board: [
      ['O', '', 'X'],
      ['X', 'X', 'O'],
      ['O', 'O', 'X'],
  ],
  marks: {
    X: 'botA',
    O: 'botB',
  },
};

describe('Noughts and Crosses', () => {
  it('sets the initial state with an initial player', () => {
    const initialState = noughtsAndCrosses.createInitialState(
      ['botA', 'botB']
    );
    expect(initialState.board).toEqual([
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
    ]);
    expect(initialState.nextPlayer).toEqual('botA');
    expect(initialState.players).toEqual(['botA', 'botB']);
    expect(initialState.marks).toEqual({ X: 'botA', O: 'botB' });
  });

  describe('validator', () => {
    it('accepts valid moves', () => {
      const isValid = noughtsAndCrosses.validator(
        midGameState,
        { space: [2, 0], mark: 'O', player: 'botB' }
      );
      expect(isValid).toBeTruthy();
    });

    it('rejects the move if it is not a player\'s turn', () => {
      const isValid = noughtsAndCrosses.validator(
        midGameState,
        { space: [2, 0], mark: 'X', player: 'botA' }
      );
      expect(isValid).toBeFalsy();
    });

    it('rejects the move if the player is using the wrong mark', () => {
      const isValid = noughtsAndCrosses.validator(
        midGameState,
        { space: [2, 0], mark: 'X', player: 'botB' }
      );
      expect(isValid).toBeFalsy();
    });

    it('rejects the move if the player is a nested mark', () => {
      const isValid = noughtsAndCrosses.validator(
        midGameState,
        { space: [2, 0], mark: ['O'], player: 'botB' }
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
          { space, mark: 'O', player: 'botB' }
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
          { space, mark: 'O', player: 'botB' }
        );
        expect(isValid).toBeFalsy();
      });
    });
  });

  describe('reducer', () => {
    it('adds the mark to the space', () => {
      const newState = noughtsAndCrosses.reducer(
        midGameState,
        { space: [2, 0], mark: 'O', player: 'botB' }
      );

      expect(newState.board).toEqual([
        ['', '', 'X'],
        ['', 'X', ''],
        ['O', 'O', ''],
      ]);
    });

    it('flips the nextPlayer', () => {
      const newState = noughtsAndCrosses.reducer(
        midGameState,
        { space: [2, 0], mark: 'O', player: 'botB' }
      );
      expect(newState.players).toEqual(midGameState.players);
      expect(newState.nextPlayer).toEqual('botA');
    });

    it('sets complete to false', () => {
      const newState = noughtsAndCrosses.reducer(
        midGameState,
        { space: [2, 0], mark: 'O', player: 'botB' }
      );
      expect(newState.complete).toBeFalsy();
      expect(newState.victor).toBeFalsy();
      expect(newState.reason).toBeFalsy();
    });

    it('sets complete to true if a bot wins', () => {
      const newState = noughtsAndCrosses.reducer(
        noughtsAndCrosses.reducer(
          midGameState,
          { space: [2, 2], mark: 'O', player: 'botB' }
        ),
        { space: [2, 0], mark: 'X', player: 'botA' }
      );
      expect(newState.complete).toBeTruthy();
      expect(newState.victor).toEqual('botA');
      expect(newState.reason).toEqual('complete');
    });

    it('sets complete to true when it is a draw', () => {
      const newState = noughtsAndCrosses.reducer(
        endGameState,
        { space: [0, 1], mark: 'X', player: 'botA' }
      );
      expect(newState.complete).toBeTruthy();
      expect(newState.victor).toEqual(null);
      expect(newState.reason).toEqual('complete');
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