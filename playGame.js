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
  const gracePeriod = 500;
  const strikes = 3;
  const timeout = 3000;

  const players = _.pluck(connections, 'botId');

  const reasonComplete = 'complete';
  const reasonDisconnected = 'disconnect';
  const reasonTimeout = 'timeout';
  const reasonIdiocy = "Didn't write unit tests";

  function otherPlayer(player) {
    return _.without(players, player)[0]
  }

  return Rx.Observable.of(
    // Game concluded normally
    update$
      .filter(({ state: { complete } }) => complete)
      .map(({ state: { victor } }) => ({
        victor,
        reason: reasonComplete,
      })),

    // Player disconnected
    ...connections.map(({ ws, botId }) => (
      wsObservable(ws)
        .ignoreElements()
        .delay(gracePeriod)
        .concat(Rx.Observable.of({
          victor: otherPlayer(botId),
          reason: reasonDisconnected,
        }))
    )),

    // Both players disconnected (within gracePeriod ms of each other)
    Rx.Observable.from(connections)
      .concatMap(({ ws }) => wsObservable(ws).ignoreElements())
      .concat(Rx.Observable.of({
        victor: null,
        reason: reasonDisconnected,
      })),

    // Player repeatedly makes invalid turns
    ...players.map((player) => (
      update$
        .filter(({ turn }) => turn && turn.player == player && !turn.valid)
        .take(strikes)
        .ignoreElements()
        .concat(Rx.Observable.of({
          victor: otherPlayer(player),
          reason: reasonIdiocy,
        }))
        .delay(5)
    )),

    // The next player fails to make a valid move within the timeout period
    update$
      .filter(({ turn }) => !turn || turn.valid)
      .timeout(timeout)
      .concat(Rx.Observable.never())
      .catch(e => Rx.Observable.empty())
      .last()
      .map(({ state: { nextPlayer } }) => ({
        victor: otherPlayer(nextPlayer),
        reason: reasonTimeout,
      }))
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