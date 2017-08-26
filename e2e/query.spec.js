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
  waitFor,
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
        bots(gameType: NOUGHTS_AND_CROSSES) {
          name
          gameType
          owner
        }
      }
    `)
    log(JSON.stringify(body, null, 2));

    expect(body.data.bots).to.deep.have.members([
      {
        name: 'BotOne',
        gameType: 'NOUGHTS_AND_CROSSES',
        owner: 'Anonymous',
      },
      {
        name: 'BotTwo',
        gameType: 'NOUGHTS_AND_CROSSES',
        owner: 'Anonymous',
      },
      {
        name: 'BotThree',
        gameType: 'NOUGHTS_AND_CROSSES',
        owner: 'Me',
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
        games(gameType: NOUGHTS_AND_CROSSES) {
          __typename
          ...on NoughtsAndCrossesGame {
            bots {
              name
            }
            gameType
            result {
              reason
              victor { name }
            }
            board
            marks {
              X { name }
              O { name }
            }
            turns {
              bot { name }
              mark
              space
            }
          }
        }
      }
    `)
    log(JSON.stringify(body, null, 2));

    expect(body.data.games).to.deep.equal([{
      __typename: 'NoughtsAndCrossesGame',
      bots: [
        { name: 'BotOne' },
        { name: 'BotTwo' },
      ],
      gameType: 'NOUGHTS_AND_CROSSES',
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

  it('queries contests', async () => {
    // First, play some full games.
    const sockets1 = await authenticateBots('myContest');
    await sendTurn(sockets1.BotOne, 'X', [0, 0]);
    await sendTurn(sockets1.BotTwo, 'O', [1, 1]);
    await sendTurn(sockets1.BotOne, 'X', [1, 0]);
    await sendTurn(sockets1.BotTwo, 'O', [0, 2]);
    await sendTurn(sockets1.BotOne, 'X', [2, 0], true, true);

    const sockets2 = await authenticateBots('myContest');
    await sendTurn(sockets2.BotOne, 'X', [0, 0]);
    await sendTurn(sockets2.BotTwo, 'O', [1, 1]);
    await sendTurn(sockets2.BotOne, 'X', [1, 0]);
    await sendTurn(sockets2.BotTwo, 'O', [2, 0]);
    await sendTurn(sockets2.BotOne, 'X', [0, 2]);
    await sendTurn(sockets2.BotTwo, 'O', [0, 1]);
    await sendTurn(sockets2.BotOne, 'X', [2, 1]);
    await sendTurn(sockets2.BotTwo, 'O', [2, 2]);
    await sendTurn(sockets2.BotOne, 'X', [1, 2], true, true);

    // Not in the contest
    const sockets3 = await authenticateBots();
    await sendTurn(sockets3.BotOne, 'X', [0, 0]);
    await sendTurn(sockets3.BotTwo, 'O', [1, 1]);
    await sendTurn(sockets3.BotOne, 'X', [1, 0]);
    await sendTurn(sockets3.BotTwo, 'O', [0, 2]);
    await sendTurn(sockets3.BotOne, 'X', [2, 0], true, true);

    await waitFor(50);

    // Next, look up the contest via a GraphQL query.
    const body = await graphql(`
      query {
        contest(gameType: NOUGHTS_AND_CROSSES, name: "myContest") {
          name
          gameType
          rankings {
            bot { name }
            wins
            draws
            losses
            played
            score
          }
          games {
            __typename
            ...on NoughtsAndCrossesGame {
              contest { name }
              bots {
                name
              }
              result {
                victor { name }
              }
            }
          }
        }
      }
    `)
    log(JSON.stringify(body, null, 2));

    expect(body.data.contest).to.deep.equal({
      name: 'myContest',
      gameType: 'NOUGHTS_AND_CROSSES',
      rankings: [
        {
          bot: { name: 'BotOne' },
          wins: 1,
          draws: 1,
          losses: 0,
          played: 2,
          score: 4,
        },
        {
          bot: { name: 'BotTwo' },
          wins: 0,
          draws: 1,
          losses: 1,
          played: 2,
          score: 1,
        },
      ],
      games: [
        {
          __typename: 'NoughtsAndCrossesGame',
          contest: { name: 'myContest' },
          bots: [
            { name: 'BotOne' },
            { name: 'BotTwo' },
          ],
          result: {
            victor: null,
          },
        },
        {
          __typename: 'NoughtsAndCrossesGame',
          contest: { name: 'myContest' },
          bots: [
            { name: 'BotOne' },
            { name: 'BotTwo' },
          ],
          result: {
            victor: { name: 'BotOne' },
          },
        },
      ],
    });
  });
});
