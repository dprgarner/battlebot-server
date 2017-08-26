import BluebirdPromise from 'bluebird';
import { expect } from 'chai';
import { MongoClient } from 'mongodb';

import {
  bundleAndStartMongo,
  restartServerAndClearDb,
  killServer,
  killMongo,
  log,
  graphql,
} from './utils';

const MongoClientPromise = BluebirdPromise.promisifyAll(MongoClient);

describe('registering bots', function() {
  // Check the GraphQL mutations that register bots.
  // Requires MongoDB to be installed locally.
  this.timeout(5000);

  before(bundleAndStartMongo);
  beforeEach(restartServerAndClearDb);
  afterEach(killServer);
  after(killMongo);

  it('registers a bot', async () => {
    const body = await graphql(`
      mutation {
        registerBot(gameType: NOUGHTS_AND_CROSSES, name: "BotFour", owner: "Me") {
          password
          bot {
            name
            owner
            gameType
            dateRegistered
          }
        }
      }
    `)

    log(JSON.stringify(body, null, 2));

    expect(body.data.registerBot.password).to.be.ok;
    expect(body.data.registerBot.bot.name).to.equal('BotFour');
    expect(body.data.registerBot.bot.owner).to.equal('Me');
    expect(body.data.registerBot.bot.dateRegistered).to.be.ok;
    expect(body.data.registerBot.bot.gameType).to.be.ok;

    const db = await MongoClientPromise.connect(
      'mongodb://localhost:27017/test_db'
    )
    try {
      const botData = await db.collection('bots').findOne({ name: 'BotFour' });
      expect(botData).to.be.ok;
      expect(botData.gameType).to.equal('NOUGHTS_AND_CROSSES');
      expect(botData.name).to.equal('BotFour');
      expect(botData.owner).to.equal('Me');
      expect(botData.password).to.be.ok;
    } finally {
      await db.close();
    }
  });

  it('rejects registration if the bot name is taken', async () => {
    const body = await graphql(`
      mutation {
        registerBot(gameType: NOUGHTS_AND_CROSSES, name: "BotOne", owner: "Me") {
          password
          bot {
            name
            owner
            gameType
            dateRegistered
          }
        }
      }
    `)
    log(body);

    expect(body.errors).to.have.length(1);
    expect(body.errors[0].message).to.equal(
      'Bot already registered with that name'
    );
  });

  it('rejects registration if the owner is not specified', async () => {
    const response = await graphql(`
      mutation {
        registerBot(gameType: NOUGHTS_AND_CROSSES, name: "BotFour") {
          password
          bot {
            name
            owner
            gameType
            dateRegistered
          }
        }
      }
    `, true)

    log(response.body);
    expect(response.statusCode).to.equal(400);
    expect(response.body.errors).to.have.length(1);
  });

  it('rejects registration if the game name is unrecognised', async () => {
    const response = await graphql(`
      mutation {
        registerBot(gameType: adasdasd, name: "BotFour") {
          password
          bot {
            name
            owner
            gameType
            dateRegistered
          }
        }
      }
    `, true)

    log(response.body);
    expect(response.statusCode).to.equal(400);
    expect(response.body.errors.length).to.be.ok;
  });
});
