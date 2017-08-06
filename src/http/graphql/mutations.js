import ClientError from '../error';
import connect from '../../db';
import games from '../../games';
import { createRandomHash } from '../../hash';

export function registerBot(gameType, bot, owner) {
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
