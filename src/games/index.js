const requireAll = require('require-all');

module.exports = requireAll({
  dirname: __dirname,
  filter: (filename) => (
    filename != 'index.js' &&
    !filename.endsWith('.test.js') &&
    filename.split('.')[0]
  ),
});
