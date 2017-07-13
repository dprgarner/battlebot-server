import connect from './db';

const mockDb = { close: jest.fn(() => Promise.resolve(true)) };

jest.mock('mongodb', () => ({
  MongoClient: {
    connect: jest.fn(() => Promise.resolve(mockDb))
  }
}));

describe('db', () => {
  beforeEach(() => {
    mockDb.close.mockClear();
  });

  it('calls close once the promise has been resolved', async () => {
    expect(mockDb.close).not.toHaveBeenCalled();
    await connect((db) => Promise.resolve())
    expect(mockDb.close).toHaveBeenCalled();  
  });

  it('calls close even if the promise fails', async () => {
    expect(mockDb.close).not.toHaveBeenCalled();
    const myErr = new Error('bang');
    await expect(
      connect((db) => Promise.reject(myErr))
    ).rejects.toEqual(myErr);
    expect(mockDb.close).toHaveBeenCalled();
  });
});