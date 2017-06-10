const Rx = require('rxjs/Rx');

// const sanityCheck = {};

function game({ updater, validator }) {
  // This function transforms the incomingTurn$ stream into the update$
  // stream.
  return incomingTurn$ => {
    // The updater can in general be non-deterministic (make random calls),
    // so every scan must be evaluated EXACTLY once, regardless of the
    // subscriptions. (Hence all the shareReplays.)
    const update$ = incomingTurn$
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
        // if (!sanityCheck[turn.player]) sanityCheck[turn.player] = {};
        // if (sanityCheck[turn.player][turn.turn]) throw new Error(sanityCheck);
        // sanityCheck[turn.player][turn.turn] = true;

        return { turn, valid, state: newState };
      })
      .shareReplay();

    return update$
      .takeWhile(({ state: { complete } }) => !complete)
      .concat(update$.skipWhile(({ state: { complete } }) => !complete).take(1))
      .shareReplay();
  };
}

function createGame({ players, updater, validator }) {
  return incomingMessage$ => {
    // TODO pluck out the players' turns from incomingMessage$
    const incomingTurn$ = incomingMessage$;

    const update$ = incomingTurn$
      .let(game({ updater, validator }));

    return Rx.Observable.from(players)
      .flatMap(playerId => update$
        .filter(data => !data.turn || data.valid || data.turn.player === playerId)
        .map(data => ({ to: playerId, data }))
      );
  }
}

module.exports = createGame;
