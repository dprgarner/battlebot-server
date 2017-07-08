const _ = require('underscore');
const DataLoader = require('dataloader');

const connect = require('../db');
const { gameTypes } = require('./typeDefs');

function botLoader(game) {
  return new DataLoader(ids =>
    connect(db => db
      .collection('bots')
      .find({ game, bot_id: { $in: ids } }, { _id: 0, pass_hash: 0 })
      .toArray()
    )
    .then(unorderedJson => ids.map(
      bot_id => _.find(unorderedJson, { bot_id })
    ))
  );
}

module.exports = {
  Bot: _.object(gameTypes.map(game => [game, botLoader(game)])),

  // If these are being called more than once, then you're probably doing it
  // wrong... but I guess this stops the server from getting DDoS'ed.
  allBots: new DataLoader(games =>
    Promise.all(games.map(game =>
      connect(db => db
        .collection('bots')
        .find({ game }, { _id: 0, pass_hash: 0 })
        .toArray()
      )
    )),
    { batch: false }
  ),

  allGames: new DataLoader(games =>
    Promise.all(games.map(game =>
      connect(db => db
        .collection('games')
        .find({ game })
        .toArray()
      )
    )),
    { batch: false }
  ),
};
