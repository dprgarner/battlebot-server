import _ from 'underscore';
import DataLoader from 'dataloader';
import stringify from 'json-stable-stringify';

import connect from 'battlebots/db';

function createJsonKeyLoader(loadFn) {
  return () => new DataLoader(loadFn, { cacheKeyFn: stringify });
}

const BotLoader = createJsonKeyLoader(async (botQueries) => {
  // Expects queries of the form { gameType, name } for finding a single bot
  // per query.
  // First, group by game.
  const botsByGame = {};
  for (let { gameType, name } of botQueries) {
    botsByGame[gameType] = botsByGame[gameType] || [];
    botsByGame[gameType].push(name);
  }

  // A bot is specified by gameType AND name, so both of these are needed to
  // find the relevant bot data. (Two bots can share the same name but have
  // different game types.)
  const allBots = await Promise.all(
    _.map(botsByGame, (botNames, gameType) => (
      connect(db => db
        .collection('bots')
        .find({ gameType, name: { $in: botNames } }, { _id: 0, password: 0 })
        .toArray()
      )
    ))
  );

  // Return the resolved list of bots in the same order as the original
  // queries.
  const resolvedBots = {};
  for (let gameGroupedBots of allBots) {
    for (let bot of gameGroupedBots) {
      const { gameType, name } = bot;
      resolvedBots[gameType] = resolvedBots[gameType] || {};
      resolvedBots[gameType][name] = bot;
    }
  }
  return botQueries.map(
    ({ gameType, name }) => resolvedBots[gameType][name]
  );
});

// Expects queries of the form { gameType, owner? }, and returns lists of
// bots per query.
const BotsLoader = createJsonKeyLoader(botsQueries => Promise.all(
  botsQueries.map(botsQuery =>
    connect(db => db
      .collection('bots')
      .find(botsQuery, { _id: 0, password: 0 })
      .toArray()
    )
  )
));

// Expects queries of the form:
// { gameType, id?, contest? bots? anyBots? limit?, offset? }.
// Returns lists of games per query.
const GamesLoader = createJsonKeyLoader(gameQueries => Promise.all(
  gameQueries.map(gameQuery => {
    const { bots, anyBots, limit, offset } = gameQuery;
    const cleanQuery = _.pick(gameQuery, 'gameType', 'id', 'contest');

    if (bots) cleanQuery.$and = _.map(bots, bot => ({ bots: bot }));
    if (anyBots) cleanQuery.$or = _.map(anyBots, bot => ({ bots: bot }));

    return connect(db => {
      let query = db
        .collection('games')
        .find(cleanQuery)
        .sort({ startTime: -1 });

      if (limit) query = query.limit(limit);
      if (offset) query = query.skip(offset);

      return query.toArray();
    });
  })
));

// Expects queries which are simply the game types of the contest, as a
// string.
const ContestsLoader = createJsonKeyLoader(gameTypes => Promise.all(
  gameTypes.map(gameType =>
    connect(db => db
      .collection('games')
      .distinct('contest', { gameType })
    )
    .then(contests => contests.map(
      contest => ({ gameType, contest })
    ))
  )
));

export default () => ({
  Bot: BotLoader(),
  Bots: BotsLoader(),
  Games: GamesLoader(),
  Contests: ContestsLoader(),
});
