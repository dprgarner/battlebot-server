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
  let sortedBots = _.map(bots, bot => (
    { ...bot, score: 3 * bot.wins + bot.draws }
  ));

  sortScore(sortedBots);
  return sortedBots;
}

function punishLosses(bots) {
  let sortedBots = _.map(bots, bot => (
    { ...bot, score: 3 * bot.wins + 2 * bot.draws }
  ));

  sortScore(sortedBots);
  return sortedBots;
}

function balanced(bots) {
  let sortedBots = _.map(bots, bot => (
    { ...bot, score: 2 * bot.wins + bot.draws }
  ));

  sortScore(sortedBots);
  return sortedBots;
}

export default {
  Contest: {
    name: ({ contest }) => contest,
    gameType: ({ game }) => game,
    games: ({ contest, game }, { filters }, { Games }) => (
      Games.load(_.extend({ contest, game }, _.omit(filters, 'contest')))
    ),
    rankings: ({ gameType, contest }, { method }, { Games }) => (
      Games.load({ contest, gameType }).then(gameDocuments => {
        const bots = {};

        gameDocuments.forEach(game => {
          game.bots.forEach(bot => {
            if (!bots[bot]) bots[bot] = {
              gameType,
              contest,
              bot,
              wins: 0,
              losses: 0,
              draws: 0,
            };
            if (game.victor === bot) {
              bots[bot].wins += 1;
            } else if (!game.victor) {
              bots[bot].draws += 1;
            } else {
              bots[bot].losses += 1;
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
    bot: ({ gameType, bot }, _args, { Bot }) => Bot.load({ gameType, name: bot }),

    played: ({ gameType, contest, bot }, _args, { Games }) => (
      Games.load({ gameType, contest }).then(
        gameDocuments => gameDocuments.filter(
          game => game.bots.includes(bot)
        ).length
      )
    ),
  },
};
