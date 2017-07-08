const _ = require('underscore');
const { gameTypes } = require('./typeDefs');

const baseGameResolver = {
  id: ({ _id }) => _id,
  gameType: ({ game }) => game,
  players: ({ game, players }, _, { Bot }) => (
    Bot[game].loadMany(players)
  ),
  victor: ({ game, victor }, _, { Bot }) => victor && Bot[game].load(victor),
};

const resolvers = {
  Query: {
    gameTypes: () => gameTypes,
    gameType: (_, { name }) => gameTypes.includes(name) ? name : null,
  },

  Bot: {
    id: ({ bot_id }) => bot_id,
    gameType: ({ game }) => game,
    dateRegistered: ({ date_registered }) => date_registered,
  },

  GameType: {
    name: _.identity,
    games: (game, _, { allGames }) => allGames.load(game),
    bots: (game, _, { allBots }) => allBots.load(game),
  },

  Game: {
    __resolveType({ game }) {
      if (game === 'noughtsandcrosses') return 'NoughtsAndCrosses';
      return null;
    },
  },

  NoughtsAndCrosses: baseGameResolver,

  NoughtsAndCrossesMarks: {
    X: (marks, _, { Bot }) => Bot.noughtsandcrosses.load(marks.X),
    O: (marks, _, { Bot }) => Bot.noughtsandcrosses.load(marks.O),
  },

  NoughtsAndCrossesTurn: {
    player: ({ player }, _, { Bot }) => Bot.noughtsandcrosses.load(player),
  },
};

module.exports = resolvers;