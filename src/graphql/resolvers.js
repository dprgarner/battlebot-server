const _ = require('underscore');
const { gameTypes } = require('./typeDefs');

const baseGameResolver = {
  id: ({ _id }) => _id,
  gameType: ({ game }) => game,
  players: ({ game, players }, _, { Bot }) => (
    players.map(player => Bot[game].load(player))
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

module.exports = resolvers;