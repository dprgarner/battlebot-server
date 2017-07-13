import _ from 'underscore';

function sortScore(botsToSort) {
  botsToSort.sort((bot1, bot2) => {
    if (bot1.score > bot2.score) return -1;
    if (bot1.score < bot2.score) return 1;

    if (bot1.wins > bot2.wins) return -1;
    if (bot1.wins < bot2.wins) return 1;

    if (bot1.losses > bot2.losses) return 1;
    if (bot1.losses < bot2.losses) return -1;

    return 0;
  });
}

function rewardWins(bots) {
  let sortedBots = _.map(bots, bot => _.extend(
    { score: 3 * bot.wins + bot.draws }, bot
  ));

  sortScore(sortedBots);
  return sortedBots;
}

function punishLosses(bots) {
  let sortedBots = _.map(bots, bot => _.extend(
    { score: 3 * bot.wins + 2 * bot.draws }, bot
  ));

  sortScore(sortedBots);
  return sortedBots;
}

function balanced(bots) {
  let sortedBots = _.map(bots, bot => _.extend(
    { score: 2 * bot.wins + bot.draws }, bot
  ));

  sortScore(sortedBots);
  return sortedBots;
}

export default {
  Contest: {
    id: ({ contest }) => contest,
    gameType: ({ game }) => game,
    games: ({ contest, game }, { filters }, { Games }) => (
      Games.load(_.extend({ contest, game }, _.omit(filters, 'contest')))
    ),
    rankings: ({ contest, game }, { method }, { Games }) => (
      Games.load({ contest, game }).then(gameDocuments => {
        const bots = {};

        gameDocuments.forEach(game => {
          game.players.forEach(player => {
            if (!bots[player]) bots[player] = {
              game: game.game,
              contest,
              bot_id: player,
              wins: 0,
              losses: 0,
              draws: 0,
            };
            if (game.victor === player) {
              bots[player].wins += 1;
            } else if (!game.victor) {
              bots[player].draws += 1;
            } else {
              bots[player].losses += 1;
            }
          });
        });

        switch (method) {
          case 'punitive':
            return punishLosses(bots);
          case 'balanced':
            return balanced(bots);
          case 'ambitious':
          default:
            return rewardWins(bots);
        };
      })
    ),
  },

  ContestRanking: {
    bot: ({ bot_id, game }, _, { Bot }) => Bot.load({ game, bot_id }),

    played: ({ bot_id, contest, game }, _args, { Games }) => (
      Games.load({ contest, game }).then(
        gameDocuments => gameDocuments.filter(
          game => game.players.includes(bot_id)
        ).length
      )
    ),
  },
};
