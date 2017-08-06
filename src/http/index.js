import express from 'express';

import addStaticRoutes from './static';
import ClientError from './error';
import graphQLEndpoint from './graphql';

export default function createHttpServer(port) {
  const app = express();
  app.set('port', port);

  addStaticRoutes(app);
  app.use('/graphql', graphQLEndpoint);

  app.use((err, req, res, next) => {
    console.error(err);
    res
      .status(err.name === 'ClientError' ? 400 : 500)
      .json({ error: err.message });
  });

  return new Promise((resolve, reject) => {
    const server = app.listen(app.get('port'), (err) => {
      if (err) return reject(err);
      resolve({ app, server });
    });
  });
}
