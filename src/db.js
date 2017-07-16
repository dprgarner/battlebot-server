import Promise from 'bluebird';
import Rx from 'rxjs';
import { MongoClient } from 'mongodb';
import { adapt } from '@cycle/run/lib/adapt';

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

export function makeDbDriver() {
  // A Cycle.js driver for a MongoDB database connection.

  function DbDriver(outgoing$) {
    // Convert CycleJS xstream into an RxJS stream.
    outgoing$ = Rx.Observable.from(outgoing$);

    const incoming$ = outgoing$
      .map((dbRequestGenerator) => {
        const response$ = Rx.Observable.fromPromise(
          connect(dbRequestGenerator)
        );
        // For convenience: attach the original request generator onto the
        // output stream.
        response$.request = dbRequestGenerator;
        return response$;
      })
      .share();

    // Guarantees that outgoing database operations will be performed,
    // regardless of whether the responses are being listened to.
    incoming$.subscribe();

    return adapt(incoming$);
  }

  return DbDriver;
}
