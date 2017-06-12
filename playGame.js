const _ = require('underscore');
const Rx = require('rxjs/Rx');
const { createShortHash } = require('./hash');
const { wsObserver, wsObservable } = require('./sockets');
const games = require('./games');

function runGame(validator, reducer) {
  // This function transforms a stream of incoming turns into a stream of updates,
  // validating the turns and updating the state of the game.

  // The 'reducer' can in general be non-deterministic (make random calls),
  // so every scan must be evaluated EXACTLY once, regardless of the
  // subscriptions. (Hence the shareReplay.)
  return incoming$ => incoming$
    .scan(({ state: oldState }, turn) => {
      let valid = false;
      let state = oldState;
      try {
        valid = validator(oldState, turn);
      } catch (e) {
        console.error(e);
      }
      if (valid) {
        state = reducer(oldState, turn);
      }
      turn.valid = valid;
      return { state, turn };
    })
    .shareReplay();
}

function addLastTurn(update$) {
  return update$
    .takeWhile(({ state: { complete } }) => !complete)
    .concat(
      update$
      .skipWhile(({ state: { complete } }) => !complete)
      .take(1)
    );
}

function filterAndTag(player) {
  return incoming$ => incoming$
    .do(x => console.log('in', player, x))
    .map(turn => _.extend({}, turn, { player }));
}

function filterAndUntag(destPlayer) {
  return incoming$ => incoming$
    .do(x => console.log(x))
    .filter(({ turn }) => (
      !turn || turn.valid || turn.player === destPlayer
    ))
    .do(x => console.log('out', destPlayer, x));
}

function playGame(connections) {
  const gameName = connections[0].game;
  const game = games[gameName];
  const gameId = createShortHash(Math.random());
  const players = _.pluck(connections, 'botId');

  const inA$ = wsObservable(connections[0].ws)
    .let(filterAndTag(players[0]));

  const inB$ = wsObservable(connections[1].ws)
    .let(filterAndTag(players[1]));

  const out$ = inA$
    .merge(inB$)
    .startWith({ state: game.createInitialState(players) })
    .let(runGame(game.validator, game.reducer))
    .let(addLastTurn)

  out$
    .let(filterAndUntag(players[0]))
    .subscribe(wsObserver(connections[0].ws));

  out$
    .let(filterAndUntag(players[1]))
    .subscribe(wsObserver(connections[1].ws));
}

module.exports = playGame;