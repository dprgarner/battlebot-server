const _ = require('underscore');
const Rx = require('rxjs/Rx');
const { createShortHash } = require('./hash');
const { wsObserver, wsObservable } = require('./socketStreams');
const numberwang = require('./numberwang');

const games = { numberwang };

function runGame(updater, validator) {
  // This function transforms a stream of incoming turns into a stream of updates,
  // validating the turns and updating the state of the game.

  // The updater can in general be non-deterministic (make random calls),
  // so every scan must be evaluated EXACTLY once, regardless of the
  // subscriptions. (Hence the shareReplay.)
  return incoming$ => incoming$
    .scan(({ state: oldState }, { player, turn }) => {
      let valid = false;
      let state = oldState;
      try {
        valid = validator(oldState, player, turn);
      } catch (e) {
        console.error(e);
      }
      if (valid) {
        state = updater(oldState, player, turn);
      }

      return { player, turn, valid, state };
    })
    .shareReplay();
}

function addLastTurn() {
  return update$ => update$
    .takeWhile(({ state: { complete } }) => !complete)
    .concat(update$.skipWhile(({ state: { complete } }) => !complete).take(1));
}

function tagUpdates(players) {
  // Puts valid turns into the expected outgoing form, and sends updates to
  // the expected players.
  return update$ => Rx.Observable.from(players)
    .flatMap(playerId => update$
      .filter(({ player, turn, valid }) => (
        !turn || valid || player === playerId
      ))
      .map(turn => ({ to: playerId, turn }))
    )
}

function filterAndTag(player) {
  return incoming$ => incoming$
    .do(x => console.log('in', player, x))
    .filter(({ type }) => type === 'turn')
    .map(turn => ({ player, turn }));
}

function filterAndUntag(player) {
  return incoming$ => incoming$
    .filter(({ to }) => to === player)
    .map(({ turn }) => turn)
    .do(x => console.log('out', player, x));
}

function playGame(connections) {
  const gameName = connections[0].game;
  const game = games[gameName];
  const gameId = createShortHash(Math.random());
  const players = _.pluck(connections, 'botId');

  const inA$ = wsObservable(connections[0].ws)
    .let(filterAndTag(players[0]))

  const inB$ = wsObservable(connections[1].ws)
    .let(filterAndTag(players[1]))

  const initialState = game.createInitialState(players);

  const out$ = inA$
    .merge(inB$)
    .startWith({ state: initialState, turn: null, valid: null, player: null })
    .let(runGame(game.updater, game.validator))
    .let(addLastTurn())
    .let(tagUpdates(players))

  out$
    .let(filterAndUntag(players[0]))
    .subscribe(wsObserver(connections[0].ws));

  out$
    .let(filterAndUntag(players[1]))
    .subscribe(wsObserver(connections[1].ws));
}

module.exports = playGame;