const _ = require('underscore');
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

  function log(msg) {
    if (process.env.LOG) console.log(msg);
  }

  before(function(done) {
    this.timeout(50000);
    this.mongod = spawn('mongod');

    this.mongod.stderr.on('data', (data) => {
      console.error(`MongoDB error: ${data}`);
    });
    this.mongod.on('close', (code) => {
      log(`mongod exited with code ${code}`);
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
    this.server = spawn(
      'node',
      [path.join('build', 'index.js')],
      { env: _.extend({}, process.env, {
        MONGODB_URI: 'mongodb://localhost:27017/test_db',
        PORT: 4444,
      }) }
    );

    this.server.stdout.on('data', (data) => {
      log(`${data}`.trim());
    });
    this.server.stderr.on('data', (data) => {
      console.error(`Server error: ${data}`);
    });
    this.server.on('close', (code) => {
      log(`Server exited with code ${code}`);
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
        .then(() => db.close().then(() => log('Database reset')))
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

  describe('registering bots', function() {
    function graphql(query, resolveWithFullResponse) {
      return rp({
        method: 'POST',
        uri: 'http://localhost:4444/graphql',
        body: { query },
        json: true,
        simple: !resolveWithFullResponse,
        resolveWithFullResponse,
      });
    }

    it('registers a bot', () => {
      return graphql(`
        mutation {
          registerBot(name: "BotThree", owner: "Me", gameType: "noughtsandcrosses") {
            password
            bot {
              id
              owner
              gameType {
                id
              }
              dateRegistered
            }
          }
        }
      `)
      .then(body => {
        log(JSON.stringify(body, null, 2));

        expect(body.data.registerBot.password).to.be.ok;
        expect(body.data.registerBot.bot.id).to.equal('BotThree');
        expect(body.data.registerBot.bot.owner).to.equal('Me');
        expect(body.data.registerBot.bot.dateRegistered).to.be.ok;
        expect(body.data.registerBot.bot.gameType).to.be.ok;

        return MongoClientPromise.connect('mongodb://localhost:27017/test_db')
        .then(db => db.collection('bots').findOne({ name: 'BotThree' })
          .then(botData => {
            expect(botData).to.be.ok;
            expect(botData.game).to.equal('noughtsandcrosses');
            expect(botData.name).to.equal('BotThree');
            expect(botData.owner).to.equal('Me');
            expect(botData.password).to.be.ok;
          })
          .then(() => db.close().then(() => log('Database reset')))
          .catch(err => db.close().then(() => { console.error(err); throw err; }))
        )
      })
    });

    it('rejects registration if the bot name is taken', () => {
      return graphql(`
        mutation {
          registerBot(name: "BotOne", owner: "Me", gameType: "noughtsandcrosses") {
            password
            bot {
              id
              owner
              gameType {
                id
              }
              dateRegistered
            }
          }
        }
      `)
      .then(body => {
        log(body);
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.equal(
          'Bot already registered with that name'
        );
      });
    });

    it('rejects registration if the owner is not specified', () => {
      return graphql(`
        mutation {
          registerBot(name: "BotOne", gameType: "noughtsandcrosses") {
            password
            bot {
              id
              owner
              gameType {
                id
              }
              dateRegistered
            }
          }
        }
      `, true)
      .then(response => {
        log(response.body);
        expect(response.statusCode).to.equal(400);
        expect(response.body.errors).to.have.length(1);
      });
    });

    it('rejects registration if the game name is unrecognised', () => {
      return graphql(`
        mutation {
          registerBot(name: "BotOne", owner: "Me", gameType: "adasdasd") {
            password
            bot {
              id
              owner
              gameType {
                id
              }
              dateRegistered
            }
          }
        }
      `)
      .then(body => {
        log(body);
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.equal('Game not recognised');
      });
    });
  });

  describe('playing games', function() {
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

      return sockets;
    }

    it('plays and saves a game successfully', async () => {
      const sockets = await authenticateBots();

      const initialStates = await Promise.all([
        waitForMessage(sockets.BotOne),
        waitForMessage(sockets.BotTwo),
      ]);
      expect(initialStates[0]).to.deep.equal(initialStates[1]);

      const ply1 = await sendWithResponse(
        sockets.BotOne, { mark: 'X', space: [0, 0] }
      );
      log(ply1);
      expect(ply1.turn.valid).to.be.ok;
      expect(ply1.state.victor).to.not.be.ok;

      await waitFor(50);
      const ply2 = await sendWithResponse(
        sockets.BotTwo, { mark: 'O', space: [1, 1] }
      );
      log(ply2.state.board);
      expect(ply2.turn.valid).to.be.ok;
      expect(ply2.state.victor).to.not.be.ok;

      await waitFor(50);
      const ply3 = await sendWithResponse(
        sockets.BotOne, { mark: 'X', space: [1, 0] }
      );
      expect(ply3.turn.valid).to.be.ok;
      expect(ply3.state.victor).to.not.be.ok;
      log(ply3.state.board);

      await waitFor(50);
      const ply4 = await sendWithResponse(
        sockets.BotTwo, { mark: 'O', space: [0, 2] }
      );
      expect(ply4.turn.valid).to.be.ok;
      expect(ply4.state.victor).to.not.be.ok;
      log(ply4.state.board);

      await waitFor(50);
      const ply5 = await sendWithResponse(
        sockets.BotOne, { mark: 'X', space: [2, 0] }
      );
      expect(ply5.turn.valid).to.be.ok;
      expect(ply5.state.victor).to.equal('BotOne');
      log(ply5.state.board);

      await waitFor(100);

      return MongoClientPromise.connect('mongodb://localhost:27017/test_db')
        .then(db => db.collection('games').findOne({})
          .then((game) => {
            expect(game).to.be.ok;
            expect(game.bots).to.deep.equal(['BotOne', 'BotTwo']);
            expect(game.reason).to.equal('complete');
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
      expect(attempt1.state.victor).to.not.be.ok;
      log(attempt1.turn);

      await waitFor(50);
      // Not on the board
      const attempt2 = await sendWithResponse(
        sockets.BotOne, { mark: 'X', space: [-1, 1] }
      );
      expect(attempt2.turn.valid).to.not.be.ok;
      expect(attempt2.turn.space).to.deep.equal([-1, 1]);
      expect(attempt2.state.victor).to.not.be.ok;
      log(attempt2.turn);

      await waitFor(50);
      // A valid turn
      const ply = await sendWithResponse(
        sockets.BotOne, { mark: 'X', space: [0, 0] }
      );
      expect(ply.turn.valid).to.be.ok;
      expect(ply.state.victor).to.not.be.ok;
      log(ply.turn);

      await waitFor(50);
      // Already occupied square
      const attempt3 = await sendWithResponse(
        sockets.BotTwo, { mark: 'O', space: [0, 0] }
      );
      expect(attempt3.turn.valid).to.not.be.ok;
      expect(attempt3.turn.space).to.deep.equal([0, 0]);
      expect(attempt3.state.victor).to.not.be.ok;
      log(attempt3.turn);
    });

    it('rules against a bot which disconnects', async () => {
      const GRACE_PERIOD = 500;
      const sockets = await authenticateBots();

      await Promise.all([
        waitForMessage(sockets.BotOne),
        waitForMessage(sockets.BotTwo),
      ]);

      sockets.BotTwo.close();
      await waitFor(GRACE_PERIOD + 50);

      return MongoClientPromise.connect('mongodb://localhost:27017/test_db')
        .then(db => db.collection('games').findOne({})
          .then((game) => {
            expect(game).to.be.ok;
            expect(game.bots).to.deep.equal(['BotOne', 'BotTwo']);
            expect(game.victor).to.equal('BotOne');
            expect(game.reason).to.equal('disconnect');
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
      expect(ply.state.victor).to.not.be.ok;
      log(ply.state.board);

      await waitFor(TIMEOUT + 50);

      return MongoClientPromise.connect('mongodb://localhost:27017/test_db')
        .then(db => db.collection('games').findOne({})
          .then((game) => {
            expect(game).to.be.ok;
            expect(game.bots).to.deep.equal(['BotOne', 'BotTwo']);
            expect(game.victor).to.equal('BotOne');
            expect(game.reason).to.equal('timeout');
          })
          .then(() => db.close())
          .catch(err => db.close().then(() => { console.error(err); throw err; }))
        );
    });

    it('records a draw if both bots disconnect', async () => {
      const GRACE_PERIOD = 500;
      const sockets = await authenticateBots();

      await Promise.all([
        waitForMessage(sockets.BotOne),
        waitForMessage(sockets.BotTwo),
      ]);

      sockets.BotOne.close();
      sockets.BotTwo.close();
      await waitFor(GRACE_PERIOD + 50);

      return MongoClientPromise.connect('mongodb://localhost:27017/test_db')
        .then(db => db.collection('games').findOne({})
          .then((game) => {
            expect(game).to.be.ok;
            expect(game.bots).to.deep.equal(['BotOne', 'BotTwo']);
            expect(game.victor).to.not.be.ok;
            expect(game.reason).to.equal('disconnect');
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

      // Not BotTwo's turn
      for (var i = 0; i < 3; i++) {
        await waitFor(50);
        const attempt = await sendWithResponse(
          sockets.BotTwo, { mark: 'X', space: [0, 0] }
        );
        log(attempt.turn);
        expect(attempt.turn.valid).to.not.be.ok;
        expect(attempt.state.complete).to.equal(false);
      }

      const update = await waitForMessage(sockets.BotTwo);
      expect(update.state.victor).to.equal('BotOne');
    });
  });
});
