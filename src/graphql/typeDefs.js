const fs = require('fs');
const path = require('path');

const gameTypes = ['noughtsandcrosses'];

const typeDefs = fs.readFileSync(
  path.join(__dirname, 'schema.graphql'), 'utf8'
);

module.exports = { gameTypes, typeDefs };
