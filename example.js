const Rx = require('rxjs/Rx');

const { createGame } = require('./game');

/* A file for testing out the createGame transformation with a fake game. */

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
  // .take(5)  //.concat(Rx.Observable.throw(new Error('bad incomingTurn')))

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

const updateEachPlayer$ = incomingTurn$
  .let(createGame({ players: ['A', 'B'], reducer, validator }));

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