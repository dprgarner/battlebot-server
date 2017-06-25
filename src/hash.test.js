const hash = require('./hash');

describe('hash', () => {
  it('creates a hashed version of a string', () => {
    expect(hash.createHash('asdf')).toEqual(
      'f0e4c2f76c58916ec258f246851bea091d14d4247a2fc3e18694461b1816e13b'
    );
  });

  it('creates a random hash', () => {
    expect(hash.createRandomHash()).toHaveLength(64);
    expect(hash.createRandomHash()).toMatch(/([0-9a-f]{64})/);
  });

  it('creates a short random hash', () => {
    expect(hash.createShortRandomHash()).toHaveLength(16);
    expect(hash.createShortRandomHash()).toMatch(/([0-9a-f]{16})/);
  });
});