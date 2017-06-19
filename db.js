const Promise = require('bluebird')
const MongoClient = Promise.promisifyAll(require('mongodb').MongoClient);

const url = process.env.MONGODB_URI;
// const url = 'mongodb://localhost:27017/myproject';

function connect(promiseGenerator) {
  // Handle database connection and disconnection, throwing any errors after
  // disconnect.
  return MongoClient.connect(url)
    .then((db) => {
      return promiseGenerator(db)
        .then(res => db.close().then(() => res))
        .catch((err) => db.close().then(() => { throw err; }))
    });
}

module.exports = connect;