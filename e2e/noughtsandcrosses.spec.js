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

async function authenticateBots(argument) {
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

  return sockets;
}

async function sendTurn(socket, mark, space, valid=true, result=false) {
  const ply = await sendWithResponse(socket, { mark, space });
  log(ply);
  expect(ply.turn.valid).to.equal(valid);
  expect(!!ply.state.result).to.equal(result);
  await waitFor(50);
  return ply;
}

describe('playing noughts and crosses games', function() {
  /*
  Slightly crude end-to-end test designed to check that everything works.
  Requires MongoDB to be installed locally.
  */
  this.timeout(5000);

  before(bundleAndStartMongo);
  beforeEach(restartServerAndClearDb);
  afterEach(killServer);
  after(killMongo);

  it('plays and saves a game successfully', async () => {
    const sockets = await authenticateBots();

    const initialStates = await Promise.all([
      waitForMessage(sockets.BotOne),
      waitForMessage(sockets.BotTwo),
    ]);
    expect(initialStates[0]).to.deep.equal(initialStates[1]);

    await sendTurn(sockets.BotOne, 'X', [0, 0])
    await sendTurn(sockets.BotTwo, 'O', [1, 1])
    await sendTurn(sockets.BotOne, 'X', [1, 0])
    await sendTurn(sockets.BotTwo, 'O', [0, 2])
    const lastTurn = await sendTurn(sockets.BotOne, 'X', [2, 0], true, true);

    expect(lastTurn.state.result.victor).to.equal('BotOne');
    log(lastTurn.state.board);

    await waitFor(50);

    return MongoClientPromise.connect('mongodb://localhost:27017/test_db')
      .then(db => db.collection('games').findOne({})
        .then((game) => {
          expect(game).to.be.ok;
          expect(game.bots).to.deep.equal(['BotOne', 'BotTwo']);
          expect(game.result.reason).to.equal('complete');
        })
        .then(() => db.close())
        .catch(err => db.close().then(() => { console.error(err); throw err; }))
      );
  });

  it('tells a user if their move is bad', async () => {
    const sockets = await authenticateBots();

    const initialStates = await Promise.all([
      waitForMessage(sockets.BotOne),
      waitForMessage(sockets.BotTwo),
    ]);
    expect(initialStates[0]).to.deep.equal(initialStates[1]);

    // Not BotTwo's turn
    const attempt1 = await sendWithResponse(
      sockets.BotTwo, { mark: 'X', space: [0, 0] }
    );
    expect(attempt1.turn.valid).to.not.be.ok;
    expect(attempt1.state.result).to.not.be.ok;
    log(attempt1.turn);

    await waitFor(50);
    // Not on the board
    const attempt2 = await sendWithResponse(
      sockets.BotOne, { mark: 'X', space: [-1, 1] }
    );
    expect(attempt2.turn.valid).to.not.be.ok;
    expect(attempt2.turn.space).to.deep.equal([-1, 1]);
    expect(attempt2.state.result).to.not.be.ok;
    log(attempt2.turn);

    await waitFor(50);
    // A valid turn
    const ply = await sendWithResponse(
      sockets.BotOne, { mark: 'X', space: [0, 0] }
    );
    expect(ply.turn.valid).to.be.ok;
    expect(ply.state.result).to.not.be.ok;
    log(ply.turn);

    await waitFor(50);
    // Already occupied square
    const attempt3 = await sendWithResponse(
      sockets.BotTwo, { mark: 'O', space: [0, 0] }
    );
    expect(attempt3.turn.valid).to.not.be.ok;
    expect(attempt3.turn.space).to.deep.equal([0, 0]);
    expect(attempt3.state.result).to.not.be.ok;
    log(attempt3.turn);
  });

  it('rules against a bot which disconnects', async () => {
    const sockets = await authenticateBots();

    await Promise.all([
      waitForMessage(sockets.BotOne),
      waitForMessage(sockets.BotTwo),
    ]);

    sockets.BotTwo.close();
    await waitFor(50);

    return MongoClientPromise.connect('mongodb://localhost:27017/test_db')
      .then(db => db.collection('games').findOne({})
        .then((game) => {
          expect(game).to.be.ok;
          expect(game.bots).to.deep.equal(['BotOne', 'BotTwo']);
          expect(game.result.victor).to.equal('BotOne');
          expect(game.result.reason).to.equal('disconnect');
        })
        .then(() => db.close())
        .catch(err => db.close().then(() => { console.error(err); throw err; }))
      );
  });

  it('rules against a bot which times out', async function () {
    this.timeout(6000);
    const TIMEOUT = 5000;
    const sockets = await authenticateBots();

    await Promise.all([
      waitForMessage(sockets.BotOne),
      waitForMessage(sockets.BotTwo),
    ]);

    const ply = await sendWithResponse(
      sockets.BotOne, { mark: 'X', space: [0, 0] }
    );
    expect(ply.turn.valid).to.be.ok;
    expect(ply.state.result).to.not.be.ok;
    log(ply.state.board);

    await waitFor(TIMEOUT + 50);

    return MongoClientPromise.connect('mongodb://localhost:27017/test_db')
      .then(db => db.collection('games').findOne({})
        .then((game) => {
          expect(game).to.be.ok;
          expect(game.bots).to.deep.equal(['BotOne', 'BotTwo']);
          expect(game.result.victor).to.equal('BotOne');
          expect(game.result.reason).to.equal('timeout');
        })
        .then(() => db.close())
        .catch(err => db.close().then(() => { console.error(err); throw err; }))
      );
  });

  it('rules against a bot which makes multiple invalid moves', async () => {
    const sockets = await authenticateBots();

    await Promise.all([
      waitForMessage(sockets.BotOne),
      waitForMessage(sockets.BotTwo),
    ]);

    let attempt;
    // Not BotTwo's turn
    for (var i = 0; i < 3; i++) {
      await waitFor(50);
      attempt = await sendWithResponse(
        sockets.BotTwo, { mark: 'X', space: [0, 0] }
      );
      log(attempt.turn);
      if (i !== 2) {
        expect(attempt.turn.valid).to.not.be.ok;
        expect(attempt.state.result).to.not.be.ok;
      } else {
        expect(attempt.turn).to.not.be.ok;
        expect(attempt.state.result).to.be.ok;
        expect(attempt.state.result.victor).to.equal('BotOne');
      }
    }
  });
});
