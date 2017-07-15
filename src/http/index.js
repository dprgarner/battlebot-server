import express from 'express';
import { ClientError } from './error';
import addApi from './api';
import addStaticRoutes from './static';

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
