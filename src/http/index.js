import express from 'express';

import addStaticRoutes from './static';
import addApi from './static';

class ClientError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ClientError';
    this.message = message;
    this.stack = (new Error()).stack;
  }
}

export default function createHttpServer(port) {
  const app = express();
  app.set('port', port);

  addStaticRoutes(app);
  addApi(app);

  app.use((err, req, res, next) => {
    console.error(err);
    res
      .status(err instanceof ClientError ? 400 : 500)
      .json({ error: err.message });
  });

  return new Promise((resolve, reject) => {
    const server = app.listen(app.get('port'), (err) => {
      if (err) return reject(err);
      resolve({ app, server });
    });
  });
}
