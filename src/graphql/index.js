const fs = require('fs');
const path = require('path');

const _ = require('underscore');
const DataLoader = require('dataloader');
const graphqlHTTP = require('express-graphql');
const { makeExecutableSchema } = require('graphql-tools');

const loaders = require('./loaders');
const resolvers = require('./resolvers');

const typeDefs = fs.readFileSync(
  path.join(__dirname, 'schema.graphql'), 'utf8'
);
const schema = makeExecutableSchema({ typeDefs, resolvers });

module.exports = graphqlHTTP((_req, _res) => {
  const context = _.extend({}, loaders());

  return { schema, context, graphiql: true };
});
