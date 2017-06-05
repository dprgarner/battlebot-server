const Rx = require('rxjs/Rx');

function game({ reducer, validator }) {
  // This function transforms the incomingTurn$ stream into the update$
  // stream.
  return incomingTurn$ => (incomingTurn$
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
        return { turn, valid, state: newState };
      })
      .share()
      .takeWhile(({ state: { complete } }) => !complete)
      .skip(1)
    );
}

const incomingTurnA$ = Rx.Observable
  .interval(50)
  .map((x) => x);

const incomingTurnB$ = Rx.Observable
  .interval(25)
  .delay(25)
  .map((x) => -x)
  .do(x => console.log(x))

const incomingTurn$ = incomingTurnA$
  .map(turn => ({ player: 'A', turn }))
  .merge(incomingTurnB$.map(turn => ({ player: 'B', turn })))
  // .take(5).concat(Rx.Observable.throw(new Error('bad incomingTurn')))

function reducer(state = { nextPlayer: 'A', complete: false, count: 0 }, turn) {
  if (!turn) return state;

  if (Math.random() < 0.1) throw new Error('bad reducing', state);
  const count = state.count + turn.turn;
  return {
    nextPlayer: state.nextPlayer === 'A' ? 'B' : 'A',
    count,
    complete: Math.abs(count) >= 10,
  };
}

function validator(state, turn) {
  // if (Math.random() < 0.5) throw new Error('bad validation');

  return turn.player === state.nextPlayer;
}

const updates$ = incomingTurn$
  .let(game({ reducer, validator }));

const invalidTurnsA$ = updates$
  .filter(data => data.turn.player === 'A' && !data.valid);
const validTurnsA$ = updates$
  .filter(data => data.turn.player === 'A' && data.valid);
const invalidTurnsB$ = updates$
  .filter(data => data.turn.player === 'B' && !data.valid);
const validTurnsB$ = updates$
  .filter(data => data.turn.player === 'B' && data.valid);

const updatesA$ = Rx.Observable.merge(
  validTurnsA$,
  validTurnsB$,
  invalidTurnsA$
);
const updatesB$ = Rx.Observable.merge(
  validTurnsA$,
  validTurnsB$,
  invalidTurnsB$
);

// updatesA$.subscribe(
//   x => console.log('A:', x, '\n'),
//   e => console.log('argh!', e),
//   x => console.log('done')
// );
updatesB$.subscribe(
  x => console.log('B:', x, '\n'),
  e => console.log('argh!', e),
  x => console.log('done')
);

setTimeout(() => { console.log('okay')}, 1000);
