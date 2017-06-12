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

function addMetadata(player) {
  return incoming$ => incoming$
    .map(turn => _.extend({}, turn, { player, time: Date.now() }));
}

function filterToPlayer(destPlayer) {
  return incoming$ => incoming$
    .filter(({ turn }) => (
      !turn || turn.valid || turn.player === destPlayer
    ))
}

function playGame(connections) {
  const gameName = connections[0].game;
  const game = games[gameName];
  const gameId = createShortHash(Math.random());
  const players = _.pluck(connections, 'botId');

  console.log(
    `A game of ${gameName} has started between ${players[0]} and ${players[1]}.`
    + ` (ID: ${gameId})`
  );

  const inA$ = wsObservable(connections[0].ws)
  const inB$ = wsObservable(connections[1].ws)

  const out$ = inA$.let(addMetadata(players[0]))
    .merge(inB$.let(addMetadata(players[1])))
    .startWith({ state: game.createInitialState(players) })
    .let(runGame(game.validator, game.reducer))
    .let(addLastTurn)

  const victor$ = Rx.Observable.of(
    inA$
      .ignoreElements()
      .delay(5)
      .concat(Rx.Observable.of(players[1])),
    inB$
      .ignoreElements()
      .delay(5)
      .concat(Rx.Observable.of(players[0])),
    out$
      .filter(({ state: { complete } }) => complete)
      .map(({ state: { victor } }) => victor)
  )
    .mergeAll()
    .take(1)
    .delay(5)
    .share();

  victor$
    .subscribe(victor => console.log(
      `${victor} has won a game of ${gameName}. (ID: ${gameId})`
    ))

  out$
    .takeUntil(victor$)
    .let(filterToPlayer(players[0]))
    .subscribe(wsObserver(connections[0].ws));

  out$
    .takeUntil(victor$)
    .let(filterToPlayer(players[1]))
    .subscribe(wsObserver(connections[1].ws));
}

module.exports = playGame;