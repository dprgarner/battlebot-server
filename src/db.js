const Promise = require('bluebird')
const MongoClient = Promise.promisifyAll(require('mongodb').MongoClient);

const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/battlebots';

function connect(promiseGenerator) {
  // Handle database connection and disconnection, throwing any errors after
  // disconnect.
  return MongoClient.connect(url)
    .then((db) => {
      return promiseGenerator(db)
        .then(res => db.close().then(() => res))
        .catch(err => db.close().then(() => { console.error(err); throw err; }))
    });
}

module.exports = connect;