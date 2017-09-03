// Oh so many utils.
import path from 'path';

import _ from 'underscore';
import BluebirdPromise from 'bluebird';
import { MongoClient } from 'mongodb';
import { spawn, exec } from 'child_process';
import rp from 'request-promise';

const MongoClientPromise = BluebirdPromise.promisifyAll(MongoClient);

export function log(msg) {
  if ((process.env.LOG || '').trim()) console.log(msg);
}

export function bundleAndStartMongo(done) {
  this.timeout(8000);

  MongoClientPromise.connect('mongodb://localhost:27017/test_db')
  .catch(e => {
    this.mongod = spawn('mongod');

    this.mongod.stderr.on('data', (data) => {
      console.error(`MongoDB error: ${data}`);
      done(e);
    });

    this.mongod.on('close', (code) => {
      log(`mongod exited with code ${code}`);
    });
  })
  .then(() => {
    const isWin = /^win/.test(process.platform);
    const babelFile = isWin ? 'babel.cmd': 'babel';

    this.babel = spawn(
      path.join(__dirname, '..', 'node_modules', '.bin', babelFile),
      [
        'server',
        '--out-dir', 'build-server',
        '--ignore', 'test.js',
        '--copy-files',
        '--source-maps', 'inline',
      ]
    );

    this.babel.stderr.on('data', (data) => {
      console.error(`Babel error: ${data}`);
    });

    this.babel.once('close', (code) => {
      if (code) return done(code);
      done();
    });
  });
}

async function clearDb() {
  const db = await MongoClientPromise.connect(
    'mongodb://localhost:27017/test_db'
  );

  try {
    await Promise.all([
      db.collection('bots').deleteMany({}),
      db.collection('games').deleteMany({}),
    ]);
    await Promise.all([
      db.collection('bots').insertOne({
        gameType: 'NOUGHTS_AND_CROSSES',
        name: 'BotOne',
        password : 'abc123',
        owner : 'Anonymous',
      }),
      db.collection('bots').insertOne({
        gameType: 'NOUGHTS_AND_CROSSES',
        name: 'BotTwo',
        password : '321cba',
        owner : 'Anonymous',
      }),
      db.collection('bots').insertOne({
        gameType: 'NOUGHTS_AND_CROSSES',
        name: 'BotThree',
        password : 'iozz2',
        owner : 'Me',
      }),
    ]);
    log('Database reset');
  } finally {
    await db.close();
  }
}

export function restartServerAndClearDb() {
  this.timeout(3500);
  this.server = spawn(
    'node',
    [path.join(__dirname, '..', 'build-server', 'index.js')],
    {
      env: {
        ...process.env, 
        MONGODB_URI: 'mongodb://localhost:27017/test_db',
        PORT: 4444,
      },
    }
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

  return Promise.all([
    clearDb(),
    // Poll the page until it starts.
    waitFor(() => rp('http://localhost:4444'), 3000),
  ])

  // Wait until the server is responding
  setTimeout(done, 1000);
}

export function killServer() {
  this.server && this.server.kill();
}

export function killMongo() {
  this.mongod && this.mongod.kill();
}

export function wait(time) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, time);
  });
}

function waitFor(assertion, timeout=2000) {
    // Attempt an assertion repeatedly until it passes or times out. The
    // argument 'assertion' can be a synchronous function which throws an
    // error, or a promise generator.

    const startTime = Date.now();
    const cutoffTime = Date.now() + timeout;
    const interval = 100;

    function tryAgain() {
        // Wait a short interval, and then attempt the assertion again.
        return new Promise(resolve => setTimeout(resolve, interval))
        .then(assertion)
        .catch(e => {
          if (Date.now() > cutoffTime) throw e;
          return tryAgain();
        });
    }

    return Promise.resolve()
      .then(assertion)
      .catch(tryAgain);
}

export function graphql(query, resolveWithFullResponse) {
  return rp({
    method: 'POST',
    uri: 'http://localhost:4444/graphql',
    body: { query },
    json: true,
    simple: !resolveWithFullResponse,
    resolveWithFullResponse,
  });
}
