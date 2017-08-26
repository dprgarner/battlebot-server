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

import { authenticateBots, sendTurn } from './noughtsandcrosses.spec'

const MongoClientPromise = BluebirdPromise.promisifyAll(MongoClient);

describe('query', function() {
  // Check the GraphQL query for bots.
  // Requires MongoDB to be installed locally.
  this.timeout(5000);

  before(bundleAndStartMongo);
  beforeEach(restartServerAndClearDb);
  afterEach(killServer);
  after(killMongo);

  it('queries bots', async () => {
    const body = await graphql(`
      query {
        gameType(name: "noughtsandcrosses") {
          bots {
            name
            gameType {
              name
            }
            owner
            dateRegistered
          }
        }
      }
    `)
    log(JSON.stringify(body, null, 2));

    expect(body.data.gameType.bots).to.deep.have.members([
      {
        "name": "BotOne",
        "gameType": {
          "name": "noughtsandcrosses"
        },
        "owner": "Anonymous",
        "dateRegistered": null,
      },
      {
        "name": "BotTwo",
        "gameType": {
          "name": "noughtsandcrosses"
        },
        "owner": "Anonymous",
        "dateRegistered": null,
      },
      {
        "name": "BotThree",
        "gameType": {
          "name": "noughtsandcrosses"
        },
        "owner": "Me",
        "dateRegistered": null,
      },
    ]);
  });

  it('queries games', async () => {
    // First, play a full game.
    const sockets = await authenticateBots();

    await sendTurn(sockets.BotOne, 'X', [0, 0])
    await sendTurn(sockets.BotTwo, 'O', [1, 1])
    await sendTurn(sockets.BotOne, 'X', [1, 0])
    await sendTurn(sockets.BotTwo, 'O', [0, 2])
    await sendTurn(sockets.BotOne, 'X', [2, 0], true, true);

    // Next, look up the game via a GraphQL query.
    const body = await graphql(`
      query {
        gameType(name: "noughtsandcrosses") {
          games {
            __typename
            ...on NoughtsAndCrosses {
              bots {
                name
              }
              gameType {
                name
              }
              result {
                victor {
                  name
                }
                reason
              }
              board
              marks {
                X {
                  name
                }
                O {
                  name
                }
              }
              turns {
                space
                mark
                bot {
                  name
                }
              }
            }
          }
        }
      }
    `)
    log(JSON.stringify(body, null, 2));

    expect(body.data.gameType.games).to.deep.equal([{
      __typename: 'NoughtsAndCrosses',
      bots: [
        { name: 'BotOne' },
        { name: 'BotTwo' },
      ],
      gameType: { name: 'noughtsandcrosses' },
      result: {
        reason: 'complete',
        victor: { name: 'BotOne' },
      },
      board: [
        ['X', '', 'O'],
        ['X', 'O', ''],
        ['X', '', ''],
      ],
      marks: {
        X: { name: 'BotOne' },
        O: { name: 'BotTwo' },
      },
      turns: [
        {
          bot: { name: 'BotOne' },
          mark: 'X',
          space: [0, 0],
        },
        {
          bot: { name: 'BotTwo' },
          mark: 'O',
          space: [1, 1],
        },
        {
          bot: { name: 'BotOne' },
          mark: 'X',
          space: [1, 0],
        },
        {
          bot: { name: 'BotTwo' },
          mark: 'O',
          space: [0, 2],
        },
        {
          bot: { name: 'BotOne' },
          mark: 'X',
          space: [2, 0],
        },
      ],
    }]);
  });
});
