const _ = require('underscore');
const DataLoader = require('dataloader');
const graphqlHTTP = require('express-graphql');
const { makeExecutableSchema } = require('graphql-tools');

const { typeDefs } = require('./typeDefs');
const loaders = require('./loaders');
const resolvers = require('./resolvers');

const schema = makeExecutableSchema({ typeDefs, resolvers });

module.exports = graphqlHTTP(() => {
  const context = _.extend({}, loaders);

  return { schema, context, graphiql: true };
});
