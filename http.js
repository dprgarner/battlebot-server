const _ = require('underscore');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

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

  app.get('/client.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'client.html'));
  });

  app.get('/bots', (req, res, next) => {
    connect(db => db
      .collection('users')
      .aggregate([
        { $project: { _id: 0, pass_hash: 0 } },
        { $group: { _id: "$game", bots: { $push: "$$ROOT" } } }
      ])
      .toArray()
    )
    .then(dbResults => {
      const json = _.object(dbResults.map(game => [
        game._id,
        _.map(game.bots, bot => _.omit(bot, 'game')),
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
        .collection('users')
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
        const users = db.collection('users');

        return users
          .count({ bot_id })
          .then((count) => {
            if (count) throw new ClientError('Username already registered');
          })
          .then(() => users.insertOne({
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

  app.use((err, req, res, next) => {
    console.error(err);
    res
      .status(err instanceof ClientError ? 400 : 500)
      .json({ error: err.message });
  });

  return new Promise((resolve, reject) => {
    app.listen(app.get('port'), (err) => {
      if (err) return reject(err);
      resolve(app);
    });
  });
}

module.exports = createHttpServer;