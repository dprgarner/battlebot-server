import _ from 'underscore';
import contestResolvers from './contestResolvers';
import { registerBot } from './mutations';

const baseGameResolver = {
  id: ({ _id }) => _id,

  bots: ({ gameType, bots }, _, { Bot }) => (
    Bot.loadMany(bots.map(name => ({ gameType, name })))
  ),

  result: ({ gameType, result }) => (result && _.extend({ gameType }, result)),

  contest: ({ gameType, contest }) => (contest && { gameType, contest }),
};

const resolvers = {
  Query: {
    games: (_root, { gameType, filters }, { Games }) => (
      Games.load({ gameType, ...filters })
    ),
    game: (_root, { gameType, id }, { Games }) => (
      Games.load({ gameType, _id: id }).then(games => games && games[0])
    ),
    bots: (_root, args, { Bots }) => Bots.load(args),
    contest: (_root, { gameType, name }) => ({ gameType, contest: name }),
    contests: (_root, { gameType }, { Contests }) => Contests.load(gameType),
  },

  Mutation: {
    registerBot: (_, { gameType, name, owner }) => (
      registerBot(gameType, name, owner)
    ),
  },

  Game: {
    __resolveType({ gameType }) {
      if (gameType === 'NOUGHTS_AND_CROSSES') return 'NoughtsAndCrossesGame';
      return null;
    },
  },

  Result: {
    victor: ({ gameType, victor }, _, { Bot }) => (
      victor && Bot.load({ gameType, name: victor })
    ),
  },

  NoughtsAndCrossesGame: baseGameResolver,

  NoughtsAndCrossesMarks: {
    X: (marks, _, { Bot }) => Bot.load(
      { gameType: 'NOUGHTS_AND_CROSSES', name: marks.X }
    ),
    O: (marks, _, { Bot }) => Bot.load(
      { gameType: 'NOUGHTS_AND_CROSSES', name: marks.O }
    ),
  },

  NoughtsAndCrossesTurn: {
    bot: ({ name }, _, { Bot }) => Bot.load(
      { gameType: 'NOUGHTS_AND_CROSSES', name }
    ),
  },
};

export default { ...resolvers, ...contestResolvers };
