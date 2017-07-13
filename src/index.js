import { install } from 'source-map-support';
install();

import createGameSocketServer from './ws';
import createHttpServer from './http';

const port = process.env.PORT || 3000;

const server = createHttpServer(port)
  .then(({ app, server }) => {
    console.log('Express server listening on port', app.get('port'));
    createGameSocketServer({ server });
  });