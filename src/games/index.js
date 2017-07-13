import requireAll from 'require-all';

export default requireAll({
  dirname: __dirname,
  filter: (filename) => (
    filename != 'index.js' &&
    !filename.endsWith('.test.js') &&
    filename.split('.')[0]
  ),
});
