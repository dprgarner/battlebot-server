import _ from 'underscore';
import contestResolvers from './contestResolvers';
// import mutationResolves from './mutations';

import games from '../../games';
import ClientError from '../error';
import connect from '../../db';
import { createRandomHash } from '../../hash';

function registerBot(gameType, bot, owner) {
  return Promise.resolve()
    .then(() => {
      if (!games[gameType]) throw new ClientError('Game not recognised');
    })
    .then(() => connect(db => {
      const bots = db.collection('bots');
      const password = createRandomHash();
      const dateRegistered = new Date();

      return bots
        .count({ name: bot })
        .then((count) => {
          if (count) throw new ClientError('Bot already registered with that name');
        })
        .then(() => bots.insertOne({
          game: gameType,
          name: bot,
          password,
          owner,
          dateRegistered,
        }))
        .then(() => {
          console.log(`Registered ${gameType} bot ${bot}`);
          return {
            password,
            bot: {
              bot_id: bot,
              game: gameType,
              owner,
              date_registered: dateRegistered,
            },
          };
        })
    }));
}


const gameTypes = ['noughtsandcrosses'];

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
    gameType: (_, { id }) => gameTypes.includes(id) ? id : null,
  },

  Mutation: {
    registerBot: (_, { gameType, name, owner }) => (
      registerBot(gameType, name, owner)
    ),
  },

  Bot: {
    id: ({ bot_id }) => bot_id,
    gameType: ({ game }) => game,
    dateRegistered: ({ date_registered }) => date_registered,
  },

  GameType: {
    id: game => game,
    games: (game, { filters }, { Games }) => (
      Games.load({ game, ...filters})
    ),
    game: (game, { id }, { Games }) => (
      Games.load({ game, _id: id }).then(games => games && games[0])
    ),
    bots: (game, args, { Bots }) => Bots.load(_.extend({ game }, args)),
    contest: (game, { id }) => ({ game, contest: id }),
    contests: (game, args, { Contests }) => Contests.load(game),
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

export default {...resolvers, ...contestResolvers};
