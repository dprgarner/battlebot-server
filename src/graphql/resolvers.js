const _ = require('underscore');
const { gameTypes } = require('./typeDefs');

const baseGameResolver = {
  id: ({ _id }) => _id,
  gameType: ({ game }) => game,
  players: ({ game, players }, _, { Bot }) => (
    Bot.loadMany(players.map(bot_id => ({ game, bot_id })))
  ),
  victor: ({ game, victor }, _, { Bot }) => (
    victor && Bot.load({ game, bot_id: victor })
  ),
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
    games: (game, args, { Games }) => Games.load(_.extend({ game }, args)),
    bots: (game, args, { Bots }) => Bots.load(_.extend({ game }, args)),
  },

  Game: {
    __resolveType({ game }) {
      if (game === 'noughtsandcrosses') return 'NoughtsAndCrosses';
      return null;
    },
  },

  NoughtsAndCrosses: baseGameResolver,

  NoughtsAndCrossesMarks: {
    X: (marks, _, { Bot }) => Bot.load(
      { game: 'noughtsandcrosses', bot_id: marks.X }
    ),
    O: (marks, _, { Bot }) => Bot.load(
      { game: 'noughtsandcrosses', bot_id: marks.O }
    ),
  },

  NoughtsAndCrossesTurn: {
    player: ({ player }, _, { Bot }) => Bot.load(
      { game: 'noughtsandcrosses', bot_id: player }
    ),
  },
};

module.exports = resolvers;