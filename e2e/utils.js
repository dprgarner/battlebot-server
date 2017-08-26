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

  this.babel = spawn(
    path.join(__dirname, '..', 'node_modules', '.bin', babelFile),
    [
      'src',
      '--out-dir', 'build',
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
}

export function restartServerAndClearDb(done) {
  this.timeout(3000);
  this.server = spawn(
    'node',
    [path.join(__dirname, '..', 'build', 'index.js')],
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

  MongoClientPromise.connect('mongodb://localhost:27017/test_db')
    .then(db =>
      Promise.all([
        db.collection('bots').deleteMany({}),
        db.collection('games').deleteMany({}),
      ])
      .then(() => Promise.all([
        db.collection('bots').insertOne({
          gameType: "noughtsandcrosses",
          name: "BotOne",
          password : "abc123",
          owner : "Anonymous",
        }),
        db.collection('bots').insertOne({
          gameType: "noughtsandcrosses",
          name: "BotTwo",
          password : "321cba",
          owner : "Anonymous",
        }),
        db.collection('bots').insertOne({
          gameType: "noughtsandcrosses",
          name: "BotThree",
          password : "iozz2",
          owner : "Me",
        }),
      ]))
      .then(() => db.close().then(() => log('Database reset')))
      .catch(err => db.close().then(() => { console.error(err); throw err; }))
    );

  setTimeout(done, 1000);
}

export function killServer() {
  this.server && this.server.kill();
}

export function killMongo() {
  this.mongod.kill();
}

export function waitFor(time) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, time);
  });
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
