const { sha256 } = require('hash.js');

function createHash(str) {
  return sha256().update(str).digest('hex');
}

function createShortHash(str) {
  return createHash(str).slice(0, 8);
}

exports.createHash = createHash;
exports.createShortHash = createShortHash;