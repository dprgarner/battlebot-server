import Rx from 'rxjs';

import authenticate, { login } from './authenticate';
import db from './db';

const asdfHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const saltHash = '20f4868d91c9c0c3eef3b32c1a6f839794c522f25411efc9cbad6dd99e17123a';
const loginHash = '16fd8f6c8b9ce8457f85069e3ba3128f0a3e28cf806bd119b7f55916f2abe62f';

const mockDbData = {
  bot_id: 'asdf',
  pass_hash: asdfHash,
  game: 'numberwang',
};

jest.mock('./db', () => jest.fn(() => Promise.resolve(mockDbData)));

describe('login', () => {
  beforeEach(() => {
    db.mockClear();
  });

  it('queries the database for the bot', async () => {
    expect(db.mock.calls).toHaveLength(0);

    const loginResult = await login({
      bot_id: 'asdf',
      login_hash: loginHash,
      game: 'numberwang',
    }, saltHash);
    expect(db.mock.calls).toHaveLength(1);

    const findOne = jest.fn(() => mockDbData);
    const fakeDb = { collection: jest.fn(() => ({ findOne })) };

    db.mock.calls[0][0](fakeDb);
    expect(fakeDb.collection).toHaveBeenCalledWith('bots');
    expect(findOne).toHaveBeenCalledWith(
      { bot_id: 'asdf', game: 'numberwang'}
    );
  });

  it('logs in a bot when the hash is correct', async () => {
    expect(db.mock.calls).toHaveLength(0);

    const loginResult = await login({
      bot_id: 'asdf',
      login_hash: loginHash,
      game: 'numberwang',
    }, saltHash);

    expect(db.mock.calls).toHaveLength(1);
    expect(loginResult).toEqual({
      botId: 'asdf',
      game: 'numberwang',
    });
  });

  it('returns false if the login hash is incorrect', async () => {
    expect(db.mock.calls).toHaveLength(0);
    const loginResult = await login({
      bot_id: 'asdf',
      login_hash: 'wronghash',
      game: 'numberwang',
    }, saltHash);

    expect(db.mock.calls).toHaveLength(1);
    expect(loginResult).toEqual(false);
  });

  it('returns false if the bot is not in the database', async () => {
    db.mockImplementation(() => Promise.resolve());
    expect(db.mock.calls).toHaveLength(0);

    const loginResult = await login({
      bot_id: 'wrongbot',
      login_hash: loginHash,
      game: 'numberwang',
    }, saltHash);

    expect(db.mock.calls).toHaveLength(1);
    expect(loginResult).toEqual(false);
  });
});