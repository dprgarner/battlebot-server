const path = require('path');
const { spawn, exec } = require('child_process');

const { expect } = require('chai');
const rp = require('request-promise');
const { MongoClient } = require('mongodb');
const WebSocket  = require('ws');

const MongoClientPromise = require('bluebird').promisifyAll(MongoClient);

describe('end-to-end tests', function() {
  /*
  Slightly crude end-to-end test designed to check that everything works.
  Requires MongoDB to be installed locally.
  */
  this.timeout(5000);

  before(function(done) {
    this.timeout(50000);
    this.mongod = spawn('mongod');

    this.mongod.stderr.on('data', (data) => {
      console.error(`MongoDB error: ${data}`);
    });
    this.mongod.on('close', (code) => {
      console.log(`mongod exited with code ${code}`);
    });

    const isWin = /^win/.test(process.platform);
    const babelFile = isWin ? 'babel.cmd': 'babel';

    this.babel = spawn(path.join('node_modules', '.bin', babelFile), [
      'src',
      '--out-dir', 'build',
      '--ignore', 'test.js',
      '--copy-files',
      '--source-maps', 'inline',
    ]);

    this.babel.once('close', (code) => {
      if (code) return done(code);
      done();
    });
  });

  beforeEach(function(done) {
    this.timeout(3000);
    this.server = spawn('node', [path.join('build', 'index.js')], { env: {
      MONGODB_URI: 'mongodb://localhost:27017/test_db',
      PORT: 4444,
    }});

    this.server.stdout.on('data', (data) => {
      console.log(`${data}`.trim());
    });
    this.server.stderr.on('data', (data) => {
      console.error(`Server error: ${data}`);
    });
    this.server.on('close', (code) => {
      console.log(`Server exited with code ${code}`);
    });

    MongoClientPromise.connect('mongodb://localhost:27017/test_db')
      .then(db =>
        Promise.all([
          db.collection('bots').deleteMany({}),
          db.collection('games').deleteMany({}),
        ])
        .then(() => Promise.all([
          db.collection('bots').insertOne({
            game: "noughtsandcrosses",
            name: "BotOne",
            password : "abc123",
            owner : "Anonymous",
          }),
          db.collection('bots').insertOne({
            game: "noughtsandcrosses",
            name: "BotTwo",
            password : "321cba",
            owner : "Anonymous",
          }),
        ]))
        .then(() => db.close().then(() => console.log('Database reset')))
        .catch(err => db.close().then(() => { console.error(err); throw err; }))
      );

    setTimeout(done, 1000);
  });

  afterEach(function() {
    this.server && this.server.kill();
  });

  after(function() {
    this.mongod.kill();
  });

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

  function sendWithResponse(ws, msg) {
    return new Promise((resolve, reject) => {
      ws.send(JSON.stringify(msg));
      ws.once('message', msg => resolve(JSON.parse(msg)));
    });
  }

  it('plays and saves a game successfully', async () => {
    const sockets = {
      BotOne: new WebSocket('ws://localhost:4444'),
      BotTwo: new WebSocket('ws://localhost:4444'),
    };

    await Promise.all(Object.values(sockets).map(waitForOpen));

    const auth1 = await sendWithResponse(sockets.BotOne, {
      bot: 'BotOne',
      password: 'abc123',
      game: 'noughtsandcrosses',
    });
    expect(auth1).to.deep.equal({
      authentication: 'OK',
      game: 'noughtsandcrosses',
      bot: 'BotOne',
    });

    const auth2 = await sendWithResponse(sockets.BotTwo, {
      bot: 'BotTwo',
      password: '321cba',
      game: 'noughtsandcrosses',
    });
    expect(auth2).to.deep.equal({
      authentication: 'OK',
      game: 'noughtsandcrosses',
      bot: 'BotTwo',
    });

    const initialStates = await Promise.all([
      waitForMessage(sockets.BotOne),
      waitForMessage(sockets.BotTwo),
    ]);
    expect(initialStates[0]).to.deep.equal(initialStates[1]);

    const ply1 = await sendWithResponse(
      sockets.BotOne, { mark: 'X', space: [0, 0] }
    );
    expect(ply1.turn.valid).to.be.ok;
    expect(ply1.state.victor).to.not.be.ok;
    console.log(ply1.state.board);

    await waitFor(50);
    const ply2 = await sendWithResponse(
      sockets.BotTwo, { mark: 'O', space: [1, 1] }
    );
    expect(ply2.turn.valid).to.be.ok;
    expect(ply2.state.victor).to.not.be.ok;
    console.log(ply2.state.board);

    await waitFor(50);
    const ply3 = await sendWithResponse(
      sockets.BotOne, { mark: 'X', space: [1, 0] }
    );
    expect(ply3.turn.valid).to.be.ok;
    expect(ply3.state.victor).to.not.be.ok;
    console.log(ply3.state.board);

    await waitFor(50);
    const ply4 = await sendWithResponse(
      sockets.BotTwo, { mark: 'O', space: [0, 2] }
    );
    expect(ply4.turn.valid).to.be.ok;
    expect(ply4.state.victor).to.not.be.ok;
    console.log(ply4.state.board);

    await waitFor(50);
    const ply5 = await sendWithResponse(
      sockets.BotOne, { mark: 'X', space: [2, 0] }
    );
    expect(ply5.turn.valid).to.be.ok;
    expect(ply5.state.victor).to.equal('BotOne');
    console.log(ply5.state.board);

    await waitFor(100);

    return MongoClientPromise.connect('mongodb://localhost:27017/test_db')
      .then(db => db.collection('games').findOne({})
        .then((game) => {
          expect(game.players).to.deep.equal(['BotOne', 'BotTwo']);
        })
        .then(() => db.close())
        .catch(err => db.close().then(() => { console.error(err); throw err; }))
      );
  });
});
