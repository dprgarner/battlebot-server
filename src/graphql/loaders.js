const _ = require('underscore');
const DataLoader = require('dataloader');
const stringify = require('json-stable-stringify');

const connect = require('../db');
const { gameTypes } = require('./typeDefs');

function BotLoader() {
  // Expects queries of the form { game, bot_id }.
  return new DataLoader(
    botQueries => {
      const botsByGame = _.chain(botQueries)
        .groupBy('game')
        .map((bots, game) => [game, _.pluck(bots, 'bot_id')])
        .object()
        .value();

      return Promise.all(
        _.map(botsByGame, (bot_ids, game) => (
          connect(db => db
            .collection('bots')
            .find({ game, bot_id: { $in: bot_ids } }, { _id: 0, pass_hash: 0 })
            .toArray()
          )
        ))
      )
      .then(gameGroupedBots => {
        const resolvedBotsByGame = _.chain(gameGroupedBots)
          .map((bots) => [
            bots[0].game,
            _.object(_.map(bots, bot => [bot.bot_id, bot])),
          ])
          .object()
          .value();

        return botQueries.map(
          ({ bot_id, game }) => resolvedBotsByGame[game][bot_id]
        );
      });
    },
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
        delete gameQuery.players;
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

function ContestsLoader() {
  return new DataLoader(games => {
    return Promise.all(
      games.map(game =>
        connect(db => db
          .collection('games')
          .distinct('contest', { game })
        )
        .then(contests => contests.map(
          contest => ({ game, contest })
        ))
      )
    )},
    { cacheKeyFn: stringify }
  );
}

module.exports = () => ({
  Bot: BotLoader(),

  // If these are being called more than once, then you're probably doing it
  // wrong... but I guess this stops the server from getting DDoS'ed.
  Bots: BotsLoader(),
  Games: GamesLoader(),

  Contests: ContestsLoader(),
});
