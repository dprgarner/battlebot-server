const _ = require('underscore');
const express = require('express');
const path = require('path');
const bodyParser = require("body-parser");

const authenticate = require('./authenticate');
const connect = require('./db');
const matchPlayers = require('./matchPlayers');
const playGame = require('./playGame');
const { createHash } = require('./hash');
const { createWebsocketStream } = require('./sockets');
const games = require('./games');

const app = express();
const jsonParser = bodyParser.json();

function createGameSocketServer(opts) {
  createWebsocketStream(opts)
    .let(authenticate())
    .groupBy(({ game }) => game)
    .flatMap(matchPlayers)
    .subscribe(playGame);
}

createGameSocketServer({ port: 3001 });

class ClientError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ClientError';
    this.message = message;
    this.stack = (new Error()).stack;
  }
}

app.set('port', 3000);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client.html'));
});

app.get('/bots', (req, res) => {
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
  .catch(err => {
    console.error(err);
    res
      .status(err instanceof ClientError ? 400 : 500)
      .json({ error: err.message });
  });
})

app.get('/bots/:game', (req, res) => {
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
    .catch(err => {
      console.error(err);
      res
        .status(err instanceof ClientError ? 400 : 500)
        .json({ error: err.message });
    });
})

app.post('/bots/:game', jsonParser, (req, res, next) => {
  const name = req.body.name;
  const pass_hash = createHash(Math.random());
  const { bot_id } = req.body;
  const game = req.params.game;

  Promise.resolve()
    .then(() => {
      if (!games[game]) throw new ClientError('Game not recognised');
      if (!bot_id) throw new ClientError('No ID set');
    })
    .then(() => connect(db => {
      const users = db.collection('users');

      return users
        .count({ bot_id })
        .then((count) => {
          if (count) throw new ClientError('Username already registered');
        })
        .then(() => users.insertOne({ game, bot_id, pass_hash }))
        .then(() => {
          console.log(`Registered ${game} bot ${bot_id}`);
          res.json({ game, bot_id, pass_hash });
        })
    }))
    .catch(err => {
      console.error(err);
      res
        .status(err instanceof ClientError ? 400 : 500)
        .json({ error: err.message });
    });
});

app.listen(app.get('port'), (err) => {
  if (err) return console.error(err);
  console.log('Express listening on port', app.get('port'));
});