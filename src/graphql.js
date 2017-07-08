const _ = require('underscore');
const DataLoader = require('dataloader');
const graphqlHTTP = require('express-graphql');
const { makeExecutableSchema } = require('graphql-tools');

const connect = require('./db');

const typeDefs = `
  type GameType {
    name: String!
    games: [Game]
    bots: [Bot]
  }

  type Bot {
    id: String!
    gameType: GameType!
    owner: String!
    dateRegistered: String
  }

  interface Game {
    id: String!
    gameType: GameType!
    players: [Bot]
    victor: Bot
    reason: String!
    contest: String
  }

  type NoughtsAndCrosses implements Game {
    id: String!
    gameType: GameType!
    players: [Bot]
    victor: Bot
    reason: String!
    contest: String

    board: [[String]]
    startTime: String!
    contest: String!
    marks: NoughtsAndCrossesMarks!
    turns: [NoughtsAndCrossesTurn]!
  }

  type NoughtsAndCrossesMarks {
    X: Bot!
    O: Bot!
  }

  type NoughtsAndCrossesTurn {
    space: [Int]!
    mark: String!
    time: String!
    player: Bot!
  }

  type Query {
    gameTypes: [GameType]
  }
`;

const baseGameResolver = {
  id: ({ _id }) => _id,
  gameType: ({ game }) => game,
  players: ({ game, players }, _, { Bot }) => (
    players.map(player => Bot[game].load(player))
  ),
  victor: ({ game, victor }, _, { Bot }) => victor && Bot[game].load(victor),
};

const gameTypes = ['noughtsandcrosses'];

const resolvers = {
  Query: {
    gameTypes: () => gameTypes,
  },

  Bot: {
    id: ({ bot_id }) => bot_id,
    gameType: ({ game }) => game,
    dateRegistered: ({ date_registered }) => date_registered,
  },

  GameType: {
    name: game => game,
    games: (game, _, { allGames }) => allGames.load(game),
    bots: (game, _, { allBots }) => allBots.load(game),
  },

  Game: _.extend({
    __resolveType: ({ game }) => ({
      'noughtsandcrosses': 'NoughtsAndCrosses',
    }[game]),
  }, baseGameResolver),

  NoughtsAndCrosses: baseGameResolver,

  NoughtsAndCrossesMarks: {
    X: (marks, _, { Bot }) => Bot.noughtsandcrosses.load(marks.X),
    O: (marks, _, { Bot }) => Bot.noughtsandcrosses.load(marks.O),
  },

  NoughtsAndCrossesTurn: {
    player: ({ player }, _, { Bot }) => Bot.noughtsandcrosses.load(player),
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

function botLoader(game) {
  return new DataLoader(ids =>
    connect(db => db
      .collection('bots')
      .find({ game, bot_id: { $in: ids } }, { _id: 0, pass_hash: 0 })
      .toArray()
    )
    .then(unorderedJson => ids.map(
      bot_id => _.find(unorderedJson, { bot_id })
    ))
  );
}

module.exports = graphqlHTTP(() => {
  const context = {
    Bot: _.object(gameTypes.map(game => [game, botLoader(game)])),

    // If these are being called more than once, then you're probably doing it
    // wrong... but I guess this stops the server from getting DDoS'ed.
    allBots: new DataLoader(games =>
      Promise.all(games.map(game =>
        connect(db => db
          .collection('bots')
          .find({ game }, { _id: 0, pass_hash: 0 })
          .toArray()
        )
      )),
      { batch: false }
    ),

    allGames: new DataLoader(games =>
      Promise.all(games.map(game =>
        connect(db => db
          .collection('games')
          .find({ game })
          .toArray()
        )
      )),
      { batch: false }
    ),
  };

  return {
    schema,
    context,
    graphiql: true,
  };
});
