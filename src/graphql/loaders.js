const _ = require('underscore');
const DataLoader = require('dataloader');
const stringify = require('json-stable-stringify');

const connect = require('../db');
const { gameTypes } = require('./typeDefs');


function BotLoader() {
  return new DataLoader(botQueries => {
    return Promise.all(
      botQueries.map(botQuery =>
        connect(db => db
          .collection('bots')
          .findOne(botQuery, { _id: 0, pass_hash: 0 })
        )
      )
    )},
    { cacheKeyFn: stringify }
  );
}

function BotsLoader() {
  return new DataLoader(botQueries => {
    return Promise.all(
      botQueries.map(botQuery =>
        connect(db => db
          .collection('bots')
          .find(botQuery, { _id: 0, pass_hash: 0 })
          .toArray()
        )
      )
    )},
    { cacheKeyFn: stringify }
  );
}

function GamesLoader() {
  return new DataLoader(gameQueries => {
      return Promise.all(gameQueries.map(gameQuery =>
        connect(db => db
          .collection('games')
          .find(gameQuery)
          .toArray()
        )
      ));
    },
    { cacheKeyFn: stringify }
  );
}

module.exports = () => ({
  Bot: BotLoader(),

  // If these are being called more than once, then you're probably doing it
  // wrong... but I guess this stops the server from getting DDoS'ed.
  Bots: BotsLoader(),
  Games: GamesLoader(),
});
