const Rx = require('rxjs/Rx');

const sanityCheck = {'A': {}, 'B': {}};

function game({ reducer, validator }) {
  // This function transforms the incomingTurn$ stream into the update$
  // stream.
  return incomingTurn$ => {
    // The 'reducer' can in general be non-deterministic (make random calls),
    // so every scan must be evaluated EXACTLY once, regardless of the
    // subscriptions. (Hence all the shareReplays.)
    const update$ = incomingTurn$
      .startWith({ state: reducer(), turn: null, valid: null })
      .scan(({ state }, turn) => {
        let valid = false;
        let newState = state;
        try {
          valid = validator(state, turn);
        } catch (e) {}
        if (valid) {
          newState = reducer(state, turn);
        }
        // Stop the reducer from being called with the same values multiple
        // times.
        if (sanityCheck[turn.player][turn.turn]) throw new Error(sanityCheck);
        sanityCheck[turn.player][turn.turn] = true;

        return { turn, valid, state: newState };
      })
      .shareReplay();

    return update$
      .takeWhile(({ state: { complete } }) => !complete)
      .concat(update$.skipWhile(({ state: { complete } }) => !complete).take(1))
      .shareReplay();
  };
}

function createGame({ players, reducer, validator }) {
  return incomingMessage$ => {
    // TODO pluck out the players' turns from incomingMessage$
    const incomingTurn$ = incomingMessage$

    const update$ = incomingTurn$
      .let(game({ reducer, validator }));

    return Rx.Observable.from(players)
      .flatMap(playerId => update$
        .filter(data => !data.turn || data.valid || data.turn.player === playerId)
        .map(data => ({ to: playerId, data }))
      );
  }
}

module.exports = { game, createGame };