const express = require('express');
const path = require('path');
const bodyParser = require("body-parser");

const authenticate = require('./authenticate');
const connect = require('./db');
const matchPlayers = require('./matchPlayers');
const playGame = require('./playGame');
const { createHash } = require('./hash');
const { createWebsocketStream } = require('./sockets');

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
    this.message = message;
    this.stack = (new Error()).stack;
  }
}

app.set('port', 3000);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client.html'));
});

app.post('/register', jsonParser, (req, res, next) => {
  const name = req.body.name;
  const pass_hash = createHash(Math.random());
  const { bot_id, game } = req.body;

  Promise.resolve()
    .then(() => {
      if (!game) throw new ClientError('No game set');
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