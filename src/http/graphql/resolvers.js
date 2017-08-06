import _ from 'underscore';
import contestResolvers from './contestResolvers';
import { registerBot } from './mutations';

const gameTypes = ['noughtsandcrosses'];

const baseGameResolver = {
  id: ({ _id }) => _id,
  bots: ({ gameType, bots }, _, { Bot }) => (
    Bot.loadMany(bots.map(name => ({ gameType, name })))
  ),
  victor: ({ gameType, victor }, _, { Bot }) => (
    victor && Bot.load({ gameType, name: victor })
  ),
};

const resolvers = {
  Query: {
    gameTypes: () => gameTypes,
    gameType: (_, { name }) => gameTypes.includes(name) ? name : null,
  },

  Mutation: {
    registerBot: (_, { gameType, name, owner }) => (
      registerBot(gameType, name, owner)
    ),
  },

  GameType: {
    name: gameType => gameType,
    games: (gameType, { filters }, { Games }) => (
      Games.load({ gameType, ...filters })
    ),
    game: (gameType, { id }, { Games }) => (
      Games.load({ gameType, _id: id }).then(games => games && games[0])
    ),
    bots: (gameType, args, { Bots }) => Bots.load(_.extend({ gameType }, args)),
    contest: (gameType, { name }) => ({ gameType, contest: name }),
    contests: (gameType, args, { Contests }) => Contests.load(gameType),
  },

  Game: {
    __resolveType({ gameType }) {
      if (gameType === 'noughtsandcrosses') return 'NoughtsAndCrosses';
      return null;
    },
  },

  NoughtsAndCrosses: baseGameResolver,

  NoughtsAndCrossesMarks: {
    X: (marks, _, { Bot }) => Bot.load(
      { gameType: 'noughtsandcrosses', name: marks.X }
    ),
    O: (marks, _, { Bot }) => Bot.load(
      { gameType: 'noughtsandcrosses', name: marks.O }
    ),
  },

  NoughtsAndCrossesTurn: {
    bot: ({ bot }, _, { Bot }) => Bot.load(
      { gameType: 'noughtsandcrosses', name: bot }
    ),
  },
};

export default {...resolvers, ...contestResolvers};
