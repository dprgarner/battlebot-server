const _ = require('underscore');
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
    name: String!
    victor: String
    reason: String!
    contest: String
  }

  type NoughtsAndCrosses implements Game {
    id: String!
    name: String!
    victor: String
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
  }

  type Query {
    gameTypes: [GameType]
  }
`;

const baseGameResolver = {
  id: ({ _id }) => _id,
  name: ({ game }) => game,
};

function findBot(query) {
  return connect(db => db
    .collection('bots')
    .findOne(query, { _id: 0, pass_hash: 0 })
  );
}

const resolvers = {
  Query: {
    gameTypes() {
      return ['noughtsandcrosses'];
    },
  },

  Bot: {
    id: ({ bot_id }) => bot_id,
    gameType: ({ game }) => game,
    dateRegistered: ({ date_registered }) => date_registered,
  },

  GameType: {
    name: game => game,

    games: game => connect(db => db
      .collection('games')
      .find({ game })
      .toArray()
    ),

    bots: game => connect(db => db
      .collection('bots')
      .find({ game }, { _id: 0, pass_hash: 0 })
      .toArray()
    ),
  },

  Game: _.extend({
    __resolveType: ({ game }) => ({
      'noughtsandcrosses': 'NoughtsAndCrosses',
    }[game]),
  }, baseGameResolver),

  NoughtsAndCrosses: baseGameResolver,

  NoughtsAndCrossesMarks: {
    X: (marks) => findBot({ bot_id: marks.X }),
    O: (marks) => findBot({ bot_id: marks.O }),
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

module.exports = schema;