import _ from 'underscore';
import BluebirdPromise from 'bluebird';
import WebSocket  from 'ws';
import { expect } from 'chai';
import { MongoClient } from 'mongodb';

import {
  bundleAndStartMongo,
  restartServerAndClearDb,
  killServer,
  killMongo,
  log,
  graphql,
} from './utils';

const MongoClientPromise = BluebirdPromise.promisifyAll(MongoClient);

function waitForOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.once('open', () => resolve(ws));
  });
}

function waitForMessage(ws) {
  return new Promise((resolve, reject) => {
    ws.once('message', msg => resolve(JSON.parse(msg)));
  });
}

function waitFor(time) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, time);
  });
}

function sendWithResponse(ws, outMsg) {
  return new Promise((resolve, reject) => {
    ws.send(JSON.stringify(outMsg));
    ws.once('message', inMsg => resolve(JSON.parse(inMsg)));
  });
}

export async function authenticateBots() {
  const sockets = {
    BotOne: new WebSocket('ws://localhost:4444'),
    BotTwo: new WebSocket('ws://localhost:4444'),
  };

  await Promise.all(Object.values(sockets).map(waitForOpen));

  const auth1 = await sendWithResponse(sockets.BotOne, {
    name: 'BotOne',
    password: 'abc123',
    gameType: 'noughtsandcrosses',
  });
  expect(auth1).to.deep.equal({
    authentication: 'OK',
    gameType: 'noughtsandcrosses',
    name: 'BotOne',
  });

  const auth2 = await sendWithResponse(sockets.BotTwo, {
    name: 'BotTwo',
    password: '321cba',
    gameType: 'noughtsandcrosses',
  });
  expect(auth2).to.deep.equal({
    authentication: 'OK',
    gameType: 'noughtsandcrosses',
    name: 'BotTwo',
  });

  const initialStates = await Promise.all([
    waitForMessage(sockets.BotOne),
    waitForMessage(sockets.BotTwo),
  ]);
  expect(initialStates[0]).to.deep.equal(initialStates[1]);

  return sockets;
}

export async function sendTurn(
  socket,
  mark,
  space,
  valid=true,
  result=false,
  noTurn=false,
) {
  const ply = await sendWithResponse(socket, { mark, space });
  log(ply);
  if (!noTurn) expect(ply.turn.valid).to.equal(valid);
  expect(!!ply.state.result).to.equal(result);
  await waitFor(50);
  return ply;
}

describe('playing noughts and crosses games', function() {
  /*
  Slightly crude end-to-end test designed to check that a game can be played.
  Requires MongoDB to be installed locally.
  */
  this.timeout(5000);

  before(bundleAndStartMongo);
  beforeEach(restartServerAndClearDb);
  afterEach(killServer);
  after(killMongo);

  it('plays and saves a game successfully', async () => {
    const sockets = await authenticateBots();

    await sendTurn(sockets.BotOne, 'X', [0, 0])
    await sendTurn(sockets.BotTwo, 'O', [1, 1])
    await sendTurn(sockets.BotOne, 'X', [1, 0])
    await sendTurn(sockets.BotTwo, 'O', [0, 2])
    const lastTurn = await sendTurn(sockets.BotOne, 'X', [2, 0], true, true);

    expect(lastTurn.state.result.victor).to.equal('BotOne');
    log(lastTurn.state.board);

    await waitFor(50);

    const db = await MongoClientPromise.connect(
      'mongodb://localhost:27017/test_db'
    )
    try {
      const game = await db.collection('games').findOne({});
      expect(game).to.be.ok;
      expect(game.bots).to.deep.equal(['BotOne', 'BotTwo']);
      expect(game.result.reason).to.equal('complete');
    } finally {
      await db.close();
    }
  });

  it('tells a user if their move is bad', async () => {
    const sockets = await authenticateBots();

    // Not BotTwo's turn
    await sendTurn(sockets.BotTwo, 'X', [0, 0], false)

    // Not on the board
    await sendTurn(sockets.BotOne, 'X', [-1, 1], false)

    // A valid turn
    await sendTurn(sockets.BotOne, 'X', [0, 0], true)

    // Already occupied square
    await sendTurn(sockets.BotTwo, 'O', [0, 0], false)
  });

  it('rules against a bot which disconnects', async () => {
    const sockets = await authenticateBots();

    sockets.BotTwo.close();
    await waitFor(50);

    const db = await MongoClientPromise.connect(
      'mongodb://localhost:27017/test_db'
    )
    try {
      const game = await db.collection('games').findOne({});
      expect(game).to.be.ok;
      expect(game.bots).to.deep.equal(['BotOne', 'BotTwo']);
      expect(game.result.victor).to.equal('BotOne');
      expect(game.result.reason).to.equal('disconnect');
    } finally {
      await db.close();
    }
  });

  it('rules against a bot which times out', async function () {
    this.timeout(6000);
    const TIMEOUT = 5000;
    const sockets = await authenticateBots();

    await sendTurn(sockets.BotOne, 'X', [0, 0]);

    await waitFor(TIMEOUT + 50);

    const db = await MongoClientPromise.connect(
      'mongodb://localhost:27017/test_db'
    )
    try {
      const game = await db.collection('games').findOne({});
      expect(game).to.be.ok;
      expect(game.bots).to.deep.equal(['BotOne', 'BotTwo']);
      expect(game.result.victor).to.equal('BotOne');
      expect(game.result.reason).to.equal('timeout');
    } finally {
      await db.close();
    }
  });

  it('rules against a bot which makes multiple invalid moves', async () => {
    const sockets = await authenticateBots();

    let attempt;
    // Not BotTwo's turn
    for (var i = 0; i < 3; i++) {
      await waitFor(50);
      attempt = await sendTurn(sockets.BotTwo, 'X', [0, 0], false, i == 2, i == 2);
      log(attempt.turn);
    }
    expect(attempt.state.result.victor).to.equal('BotOne');
  });
});
