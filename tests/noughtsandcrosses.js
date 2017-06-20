const { expect } = require('chai');
const noughtsAndCrosses = require('../games/noughtsandcrosses');

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
    expect(initialState.board).to.deep.equal([
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
    ]);
    expect(initialState.nextPlayer).to.equal('botA');
    expect(initialState.players).to.deep.equal(['botA', 'botB']);
    expect(initialState.marks).to.deep.equal({ X: 'botA', O: 'botB' });
  });

  describe('validator', () => {
    it('accepts valid moves', () => {
      const isValid = noughtsAndCrosses.validator(
        midGameState,
        { space: [2, 0], mark: 'O', player: 'botB' }
      );
      expect(isValid).to.be.true;
    });

    it('rejects the move if it is not a player\'s turn', () => {
      const isValid = noughtsAndCrosses.validator(
        midGameState,
        { space: [2, 0], mark: 'X', player: 'botA' }
      );
      expect(isValid).to.be.false;
    });

    it('rejects the move if the player is using the wrong mark', () => {
      const isValid = noughtsAndCrosses.validator(
        midGameState,
        { space: [2, 0], mark: 'X', player: 'botB' }
      );
      expect(isValid).to.be.false;
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
        expect(isValid).to.be.false;
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
        expect(isValid).to.be.false;
      });
    });
  });

  describe('reducer', () => {
    it('adds the mark to the space', () => {
      const newState = noughtsAndCrosses.reducer(
        midGameState,
        { space: [2, 0], mark: 'O', player: 'botB' }
      );

      expect(newState.board).to.deep.equal([
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
      expect(newState.players).to.deep.equal(midGameState.players);
      expect(newState.nextPlayer).to.equal('botA');
    });

    it('sets complete to false', () => {
      const newState = noughtsAndCrosses.reducer(
        midGameState,
        { space: [2, 0], mark: 'O', player: 'botB' }
      );
      expect(newState.complete).to.be.false;
      expect(newState.victor).to.not.be.ok;
      expect(newState.reason).to.not.be.ok;
    });

    it('sets complete to true if a bot wins', () => {
      const newState = noughtsAndCrosses.reducer(
        noughtsAndCrosses.reducer(
          midGameState,
          { space: [2, 2], mark: 'O', player: 'botB' }
        ),
        { space: [2, 0], mark: 'X', player: 'botA' }
      );
      expect(newState.complete).to.be.true;
      expect(newState.victor).to.equal('botA');
      expect(newState.reason).to.equal('complete');
    });

    it('sets complete to true when it is a draw', () => {
      const newState = noughtsAndCrosses.reducer(
        endGameState,
        { space: [0, 1], mark: 'X', player: 'botA' }
      );
      expect(newState.complete).to.be.true;
      expect(newState.victor).to.equal(null);
      expect(newState.reason).to.equal('complete');
    });
  });

  describe('getVictor', () => {
    it('detects a winner', () => {
      expect(noughtsAndCrosses.getVictor([
        ['', '', 'X'],
        ['', 'X', ''],
        ['X', 'O', 'O'],
      ])).to.deep.equal('X')

      expect(noughtsAndCrosses.getVictor([
        ['X', '', 'X'],
        ['', 'X', ''],
        ['O', 'O', 'O'],
      ])).to.deep.equal('O')

      expect(noughtsAndCrosses.getVictor([
        ['', 'X', 'O'],
        ['', 'X', ''],
        ['O', 'X', 'O'],
      ])).to.deep.equal('X')

      expect(noughtsAndCrosses.getVictor([
        ['', 'X', 'O'],
        ['', 'X', 'O'],
        ['X', '', 'O'],
      ])).to.deep.equal('O')
    });

    it('detects a complete board', () => {
      expect(noughtsAndCrosses.getVictor([
        ['X', 'X', 'O'],
        ['O', 'O', 'X'],
        ['X', 'O', 'O'],
      ])).to.deep.equal(-1)
    });
  });
});