const fs = require('fs');
const path = require('path');

const _ = require('underscore');
const bodyParser = require('body-parser');
const express = require('express');
const requireDir = require('require-dir');
const marked = require('marked');

const connect = require('./db');
const { createRandomHash } = require('./hash');
const games = requireDir('./games');

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
    path.resolve(__dirname, 'readme.md'), 'utf8'
  );

  const readmeHtml = `
  <html>
    <head>
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
      'node_modules',
      'github-markdown-css',
      'github-markdown.css'
    ));
  });

  // Some simple endpoints for viewing things recorded in the database
  app.get('/bots', (req, res, next) => {
    connect(db => db
      .collection('bots')
      .aggregate([
        { $group: { _id: "$game", bots: { $push: "$$ROOT" } } }
      ])
      .toArray()
    )
    .then(dbResults => {
      const json = _.object(dbResults.map(game => [
        game._id,
        _.map(game.bots, bot => _.omit(bot, '_id', 'game', 'pass_hash')),
      ]));
      res.json(json);
    })
    .catch(next);
  });

  app.get('/bots/:game', (req, res, next) => {
    const game = req.params.game;

    Promise.resolve()
      .then(() => {
        if (!games[game]) throw new ClientError('Game not recognised');
      })
      .then(() => connect(db => db
        .collection('bots')
        .find({ game: req.params.game }, { _id: 0, pass_hash: 0, game: 0 })
        .toArray()
      ))
      .then(dbResults => {
        res.json(dbResults);
      })
      .catch(next);
  });

  app.post('/bots/:game', jsonParser, (req, res, next) => {
    const name = req.body.name;
    const pass_hash = createRandomHash();
    const { bot_id, owner } = req.body;
    const game = req.params.game;

    Promise.resolve()
      .then(() => {
        if (!games[game]) throw new ClientError('Game not recognised');
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
            game,
            bot_id,
            pass_hash,
            owner,
            date_registered: new Date(),
          }))
          .then(() => {
            console.log(`Registered ${game} bot ${bot_id}`);
            res
              .status(201)
              .json({ game, bot_id, pass_hash });
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