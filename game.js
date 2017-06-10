const Rx = require('rxjs/Rx');

const sanityCheck = {};

function runGame({ updater, validator }) {
  // This function transforms a stream of incoming turns into a stream of updates,
  // validating the turns and updating the state of the game.

  // The updater can in general be non-deterministic (make random calls),
  // so every scan must be evaluated EXACTLY once, regardless of the
  // subscriptions. (Hence the shareReplay.)
  return incoming$ => incoming$
    .startWith({ state: updater(), turn: null, valid: null })
    .scan(({ state }, { from: player, data: turn }) => {
      let valid = false;
      let newState = state;
      try {
        valid = validator(state, player, turn);
      } catch (e) {}
      if (valid) {
        newState = updater(state, player, turn);
      }
      // Stop the updater from being called with the same values multiple
      // times.
      if (!sanityCheck[player]) sanityCheck[player] = {};
      if (sanityCheck[player][turn]) throw new Error(sanityCheck);
      sanityCheck[player][turn] = true;

      return { player, turn, valid, state: newState };
    })
    .shareReplay();
}

function addLastTurn() {
  return update$ => update$
    .takeWhile(({ state: { complete } }) => !complete)
    .concat(update$.skipWhile(({ state: { complete } }) => !complete).take(1))
    .shareReplay();
}

function tagUpdates(players) {
  return update$ => Rx.Observable.from(players)
    .flatMap(playerId => update$
      .filter(({ player, turn, valid }) => (
        !turn || valid || player === playerId
      ))
      .map(data => ({ to: playerId, data }))
    )
}

function game({ players, updater, validator }) {
  return incomingMessage$ => incomingMessage$
    .let(runGame({ updater, validator }))
    .let(addLastTurn())
    .let(tagUpdates(players));
}

module.exports = game;