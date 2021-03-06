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

const SCORING = {
  PUNITIVE: punishLosses,
  BALANCED: balanced,
  AMBITIOUS: rewardWins,
};

export default {
  Contest: {
    name: ({ contest }) => contest,

    games: ({ contest, game }, { filters }, { Games }) => (
      Games.load(_.extend({ contest, game }, _.omit(filters, 'contest')))
    ),

    rankings: async ({ gameType, contest }, { method = 'AMBITIOUS' }, { Games }) => {
      const gameDocuments = await Games.load({ contest, gameType });
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
          if (game.result.victor === bot) {
            bots[bot].wins += 1;
          } else if (!game.result.victor) {
            bots[bot].draws += 1;
          } else {
            bots[bot].losses += 1;
          }
        });
      });

      return SCORING[method](bots);
    }
  },

  ContestRanking: {
    bot: ({ gameType, bot }, _args, { Bot }) => (
      Bot.load({ gameType, name: bot })
    ),

    played: ({ gameType, contest, bot }, _args, { Games }) => (
      Games.load({ gameType, contest }).then(
        gameDocuments => gameDocuments.filter(
          game => game.bots.includes(bot)
        ).length
      )
    ),
  },
};
