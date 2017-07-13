import { sha256 } from 'hash.js';

export function createHash(str) {
  return sha256().update(str).digest('hex');
}

export function createRandomHash() {
  return createHash((Math.random() * 1000000 + Math.random()) + '');
}

export function createShortRandomHash() {
  return createRandomHash().slice(0, 16);
}
