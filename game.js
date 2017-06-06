const Rx = require('rxjs/Rx');

const sanityCheck = {'A': {}, 'B': {}};

function game({ reducer, validator }) {
  // This function transforms the incomingTurn$ stream into the update$
  // stream.
  return incomingTurn$ => {
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

const incomingTurnA$ = Rx.Observable
  .interval(50)
  .map((x) => x + 1);

const incomingTurnB$ = Rx.Observable
  .interval(25)
  .delay(25)
  .map((x) => -x - 1);

const incomingTurn$ = incomingTurnA$
  .map(turn => ({ player: 'A', turn }))
  .merge(incomingTurnB$.map(turn => ({ player: 'B', turn })))
  // .take(5).concat(Rx.Observable.throw(new Error('bad incomingTurn')))

function reducer(state = { nextPlayer: 'A', complete: false, count: 0 }, turn) {
  if (!turn) return state;
  // if (Math.random() < 0.1) throw new Error('bad reducing' + JSON.stringify(state));

  const count = state.count + turn.turn;
  return {
    nextPlayer: state.nextPlayer === 'A' ? 'B' : 'A',
    count,
    complete: Math.abs(count) >= 5,
  };
}

function validator(state, turn) {
  // if (Math.random() < 0.5) throw new Error('bad validation');
  return turn.player === state.nextPlayer;
}

const update$ = incomingTurn$
  .let(game({ reducer, validator }));

const updateA$ = update$
  .filter(data => !data.turn || data.turn.player === 'A' || data.valid);
const updateB$ = update$
  .filter(data => !data.turn || data.turn.player === 'B' || data.valid);

updateA$.subscribe(
  x => console.log('A:', x, '\n'),
  e => console.log('argh!', e),
  x => console.log('done')
);

setTimeout(() => {
  console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~')
  updateB$.subscribe(
    x => console.log('B:', x, '\n'),
    e => console.log('argh!', e),
    x => console.log('done')
  );
}, 100);

setTimeout(() => { console.log('okay')}, 1000);