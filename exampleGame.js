const Rx = require('rxjs');

const game = require('./game');

/* A file for testing out the createGame transformation with a fake game. */

const incomingTurnA$ = Rx.Observable
  .interval(50)
  .map((x) => x + 1);

const incomingTurnB$ = Rx.Observable
  .interval(25)
  .delay(25)
  .map((x) => -x - 1);

const incomingTurn$ = incomingTurnA$
  .map(data => ({ from: 'A', data }))
  .merge(incomingTurnB$.map(data => ({ from: 'B', data })))
  // .take(5)  //.concat(Rx.Observable.throw(new Error('bad incomingTurn')))

const initialState = { nextPlayer: 'A', complete: false, count: 0 };
function updater(state = initialState, player, turn) {
  if (!turn) return state;
  // if (Math.random() < 0.1) throw new Error('bad reducing' + JSON.stringify(state));

  const count = state.count + turn;
  return {
    nextPlayer: state.nextPlayer === 'A' ? 'B' : 'A',
    count,
    complete: Math.abs(count) >= 5,
  };
}

function validator(state, player, turn) {
  // if (Math.random() < 0.5) throw new Error('bad validation');
  return player === state.nextPlayer;
}

const updateEachPlayer$ = incomingTurn$
  .let(game({ players: ['A', 'B'], updater, validator }));

updateEachPlayer$
  .filter(({ to }) => to === 'A')
  .map(({ data }) => data)
  .subscribe(
    x => console.log('A:', x, '\n'),
    e => console.log('argh!', e),
    x => console.log('done')
  );

setTimeout(() => {
  console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  updateEachPlayer$
    .filter(({ to }) => to === 'B')
    .map(({ data }) => data)
    .subscribe(
      x => console.log('B:', x, '\n'),
      e => console.log('argh!', e),
      x => console.log('done')
    );
}, 100);

setTimeout(() => { console.log('okay')}, 1000);

