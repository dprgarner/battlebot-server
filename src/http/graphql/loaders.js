import _ from 'underscore';
import DataLoader from 'dataloader';
import stringify from 'json-stable-stringify';

import connect from '../../db';

function BotLoader() {
  // Expects queries of the form { gameType, name }.
  return new DataLoader(
    botQueries => {
      const botsByGame = _.chain(botQueries)
        .groupBy('gameType')
        .map((bots, gameType) => [gameType, _.pluck(bots, 'name')])
        .object()
        .value();

      return Promise.all(
        _.map(botsByGame, (botNames, gameType) => (
          connect(db => db
            .collection('bots')
            .find({ gameType, name: { $in: botNames } }, { _id: 0, password: 0 })
            .toArray()
          )
        ))
      )
      .then(gameGroupedBots => {
        const resolvedBotsByGame = _.chain(gameGroupedBots)
          .map((bots) => [
            bots[0].gameType,
            _.object(_.map(bots, bot => [bot.name, bot])),
          ])
          .object()
          .value();

        return botQueries.map(
          ({ gameType, name }) => resolvedBotsByGame[gameType][name]
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
          .find(botQuery, { _id: 0, password: 0 })
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

      if (gameQuery.bots) {
        gameQuery.$and = _.map(gameQuery.bots, bot => (
          { bots: bot }
        ));
        delete gameQuery.bots;
      }

      if (gameQuery.anyBots) {
        gameQuery.$or = _.map(gameQuery.anyBots, bot => (
          { bots: bot }
        ));
        delete gameQuery.anyBots;
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
  return new DataLoader(gameTypes => {
    return Promise.all(
      gameTypes.map(gameType =>
        connect(db => db
          .collection('games')
          .distinct('contest', { gameType })
        )
        .then(contests => contests.map(
          contest => ({ gameType, contest })
        ))
      )
    )},
    { cacheKeyFn: stringify }
  );
}

export default () => ({
  Bot: BotLoader(),

  // If these are being called more than once, then you're probably doing it
  // wrong... but I guess this stops a client from accidentally hammering the
  // database.
  Bots: BotsLoader(),
  Games: GamesLoader(),

  Contests: ContestsLoader(),
});
