import Promise from 'bluebird';
import { MongoClient } from 'mongodb';

const MongoClientPromise = Promise.promisifyAll(MongoClient);

const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/battlebots';

export default function connect(promiseGenerator) {
  // Handle database connection and disconnection, throwing any errors after
  // disconnect.
  return MongoClientPromise.connect(url)
    .then((db) => {
      return promiseGenerator(db)
        .then(res => db.close().then(() => res))
        .catch(err => db.close().then(() => { console.error(err); throw err; }))
    });
}
