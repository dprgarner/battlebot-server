const fs = require('fs');
const path = require('path');

const _ = require('underscore');
const bodyParser = require('body-parser');
const express = require('express');
const marked = require('marked');

const connect = require('./db');
const { createRandomHash } = require('./hash');
const games = require('./games');

class ClientError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ClientError';
    this.message = message;
    this.stack = (new Error()).stack;
  }
}

function createHttpServer(port) {
  const app = express();
  const jsonParser = bodyParser.json();

  app.set('port', port);

  // Serve the readme
  const readmeTxt = fs.readFileSync(
    path.resolve(__dirname, '..', 'readme.md'), 'utf8'
  );

  const readmeHtml = `
  <html>
    <head>
      <title>Battlebots!</title>
      <style>
      .markdown-body {
        box-sizing: border-box;
        min-width: 200px;
        max-width: 980px;
        margin: 0 auto;
        padding: 45px;
      }
      </style>
      <link rel="stylesheet" href="theme.css">
    </head>
    <body>
      <main class="markdown-body">
        ${marked(readmeTxt)}
      </main>
    </body>
  </html>
  `;

  app.get('/', (req, res) => {
    res.end(readmeHtml);
  });

  app.get('/theme.css', function (req, res) {
    res.sendFile(path.resolve(
      __dirname,
      '..',
      'node_modules',
      'github-markdown-css',
      'github-markdown.css'
    ));
  });

  app.get('/favicon.ico', function (req, res) {
    res.sendFile(path.resolve(__dirname, '..', 'favicon.ico'));
  });

  app.get('/bots/:gameName', (req, res, next) => {
    const gameName = req.params.gameName;

    Promise.resolve()
      .then(() => {
        if (!games[gameName]) throw new ClientError('Game not recognised');
      })
      .then(() => connect(db => db
        .collection('bots')
        .find({ game: gameName }, { _id: 0, pass_hash: 0, game: 0 })
        .toArray()
      ))
      .then(dbResults => {
        res.json(dbResults);
      })
      .catch(next);
  });

  app.post('/bots/:gameName', jsonParser, (req, res, next) => {
    const name = req.body.name;
    const pass_hash = createRandomHash();
    const { bot_id, owner } = req.body;
    const gameName = req.params.gameName;

    Promise.resolve()
      .then(() => {
        if (!games[gameName]) throw new ClientError('Game not recognised');
        if (!bot_id) throw new ClientError('No ID set');
        if (!owner) throw new ClientError('No owner set');
      })
      .then(() => connect(db => {
        const bots = db.collection('bots');

        return bots
          .count({ bot_id })
          .then((count) => {
            if (count) throw new ClientError('Bot already registered with that name');
          })
          .then(() => bots.insertOne({
            game: gameName,
            bot_id,
            pass_hash,
            owner,
            date_registered: new Date(),
          }))
          .then(() => {
            console.log(`Registered ${gameName} bot ${bot_id}`);
            res
              .status(201)
              .json({ game: gameName, bot_id, pass_hash });
          })
      }))
      .catch(next);
  });

  // This might need to behave differently if the number of games becomes
  // large.
  app.get('/games/:gameName', (req, res, next) => {
    connect(db => db
      .collection('games')
      .find({ game: req.params.gameName }, { turns: 0 })
      .sort({ startTime: -1 })
      .toArray()
    )
    .then(dbResults => {
      res.json(dbResults);
    })
    .catch(next);
  });

  app.get('/games/:gameName/:gameId', (req, res, next) => {
    connect(db => db
      .collection('games')
      .findOne({ game: req.params.gameName, _id: req.params.gameId })
    )
    .then(dbResults => {
      res.json(dbResults);
    })
    .catch(next);
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res
      .status(err instanceof ClientError ? 400 : 500)
      .json({ error: err.message });
  });

  return new Promise((resolve, reject) => {
    const server = app.listen(app.get('port'), (err) => {
      if (err) return reject(err);
      resolve({ app, server });
    });
  });
}

module.exports = createHttpServer;