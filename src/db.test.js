import connect from './db';

const mockDb = { close: jest.fn(() => Promise.resolve(true)) };

jest.mock('mongodb', () => ({
  MongoClient: {
    connect: jest.fn(() => Promise.resolve(mockDb))
  }
}));

describe('db', () => {
  const consoleError = console.error;
  beforeEach(() => {
    mockDb.close.mockClear();
  });

  afterEach(() => {
    console.error = consoleError;
  });

  it('calls close even if the promise fails', async () => {
    console.error = jest.genMockFunction();
    expect(mockDb.close).not.toHaveBeenCalled();
    const myErr = new Error('bang');
    await expect(
      connect((db) => Promise.reject(myErr))
    ).rejects.toEqual(myErr);
    expect(mockDb.close).toHaveBeenCalled();
  });

  it('calls close once the promise has been resolved', async () => {
    expect(mockDb.close).not.toHaveBeenCalled();
    await connect((db) => Promise.resolve())
    expect(mockDb.close).toHaveBeenCalled();
  });
});
