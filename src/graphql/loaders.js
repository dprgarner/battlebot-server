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
  return new DataLoader(gameQueries => Promise.all(
    gameQueries.map(gameQuery => {
      gameQuery = _.extend({}, gameQuery); // Shallow-copy.

      if (gameQuery.players) {
        gameQuery.$and = _.map(gameQuery.players, player => (
          { players: player }
        ));
        delete gameQuery.onlyPlayers;
      }

      if (gameQuery.anyPlayers) {
        gameQuery.$or = _.map(gameQuery.anyPlayers, player => (
          { players: player }
        ));
        delete gameQuery.anyPlayers;
      }

      if (gameQuery.limit) return connect(db => db
        .collection('games')
        .find(_.omit(gameQuery, 'limit'))
        .sort({ startTime: -1 })
        .limit(gameQuery.limit)
        .toArray()
      );

      return connect(db => db
        .collection('games')
        .find(gameQuery)
        .sort({ startTime: -1 })
        .toArray()
      );
    })),
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
