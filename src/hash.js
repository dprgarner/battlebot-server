const { sha256 } = require('hash.js');

function createHash(str) {
  return sha256().update(str).digest('hex');
}

function createRandomHash() {
  return createHash((Math.random() * 1000000 + Math.random()) + '');
}

function createShortRandomHash() {
  return createRandomHash().slice(0, 16);
}

exports.createHash = createHash;
exports.createRandomHash = createRandomHash;
exports.createShortRandomHash = createShortRandomHash;