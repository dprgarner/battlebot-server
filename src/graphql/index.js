import fs from 'fs';
import path from 'path';

import _ from 'underscore';
import DataLoader from 'dataloader';
import graphqlHTTP from 'express-graphql';
import { makeExecutableSchema } from 'graphql-tools';

import loaders from './loaders';
import resolvers from './resolvers';

const typeDefs = fs.readFileSync(
  path.join(__dirname, 'schema.graphql'), 'utf8'
);
const schema = makeExecutableSchema({ typeDefs, resolvers });

export default graphqlHTTP((_req, _res) => {
  const context = _.extend({}, loaders());

  return { schema, context, graphiql: true };
});
