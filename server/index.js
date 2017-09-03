import { install } from 'source-map-support';
install();

import express from 'express';

import addStaticRoutes from './static';
import createGameSocketServer from './ws';
import graphQLEndpoint from './graphql';
import { ClientError } from './error';

const port = process.env.PORT || 3000;

function createHttpServer(port) {
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

const server = createHttpServer(port)
  .then(({ app, server }) => {
    console.log('Express server listening on port', app.get('port'));
    createGameSocketServer({ server });
  });
