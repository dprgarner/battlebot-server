import { ClientError } from '../error';
import connect from '../../db';
import games from '../../games';
import { createRandomHash } from '../../hash';

export function registerBot(gameType, name, owner) {
  return Promise.resolve()
    .then(() => {
      if (!games[gameType]) throw new ClientError('Game not recognised');
    })
    .then(() => connect(db => {
      const bots = db.collection('bots');
      const password = createRandomHash();
      const dateRegistered = new Date();

      return bots
        .count({ name })
        .then((count) => {
          if (count) throw new ClientError('Bot already registered with that name');
        })
        .then(() => bots.insertOne({
          gameType,
          name,
          password,
          owner,
          dateRegistered,
        }))
        .then(() => {
          console.log(`Registered ${gameType} bot ${name}`);
          return {
            password,
            bot: {
              gameType,
              name,
              owner,
              dateRegistered,
            },
          };
        })
    }));
}
