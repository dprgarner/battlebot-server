const _ = require('underscore');
const Rx = require('rxjs/Rx');
const { createShortRandomHash } = require('./hash');
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

function getVictor(connections, update$) {
  const timeout = 500;
  const strikes = 3;

  const players = _.pluck(connections, 'botId');
  const inA$ = wsObservable(connections[0].ws);
  const inB$ = wsObservable(connections[1].ws);

  const disconnected = 'disconnect';
  const idiocy = "Didn't write unit tests";

  return Rx.Observable.of(
    // Game concluded normally
    update$
      .filter(({ state: { complete } }) => complete)
      .map(({ state: { victor } }) => ({
        victor,
        reason: 'finished',
      })),

    // Player A disconnected
    inA$
      .ignoreElements()
      .delay(timeout)
      .concat(Rx.Observable.of({
        victor: players[1],
        reason: disconnected,
      })),

    // Player B disconnected
    inB$
      .ignoreElements()
      .delay(timeout)
      .concat(Rx.Observable.of({
        victor: players[0],
        reason: disconnected,
      })),

    // Both players disconnected (within timeout ms of each other)
    inA$
      .ignoreElements()
      .concat(inB$.ignoreElements())
      .concat(Rx.Observable.of({
        victor: null,
        reason: disconnected,
      })),

    // Player A keeps making invalid turns
    update$
      .do(x => console.log(x))
      .filter(({ turn }) => turn && turn.player == players[0] && !turn.valid)
      .take(strikes)
      .ignoreElements()
      .concat(Rx.Observable.of({
        victor: players[1],
        reason: idiocy,
      }))
      .delay(5),

    // Player B keeps making invalid turns
    update$
      .filter(({ turn }) => turn && turn.player == players[1] && !turn.valid)
      .take(strikes)
      .ignoreElements()
      .concat(Rx.Observable.of({
        victor: players[0],
        reason: idiocy,
      }))
      .delay(5)
  )
  .mergeAll()
  .take(1)
  .delay(5)
  .share();
}

function playGame(connections) {
  const gameName = connections[0].game;
  const game = games[gameName];
  const gameId = createShortRandomHash();
  const players = _.pluck(connections, 'botId');

  console.log(
    `A game of ${gameName} has started between ${players[0]} and ${players[1]}.`
    + ` (ID: ${gameId})`
  );

  const update$ = Rx.Observable.from(connections)
    .flatMap(({ ws, botId }) => wsObservable(ws).let(addMetadata(botId)))
    .startWith({ state: game.createInitialState(players) })
    .let(runGame(game.validator, game.reducer))
    .let(addLastTurn);

  const victor$ = getVictor(connections, update$)
  victor$
    .subscribe(({ victor, reason }) => {
      const text = victor ? 
        `${victor} has won a game of ${gameName}.` :
        `The ${gameName} game between ${players[0]} and ${players[1]} ended in a draw.`;
      console.log(text + ` (Reason: ${reason}, Game ID: ${gameId})`);
    })  

  for (let i = 0; i < connections.length; i++) {
    update$
      .takeUntil(victor$)
      .let(filterToPlayer(players[i]))
      .subscribe(wsObserver(connections[i].ws));
  }
}

module.exports = playGame;