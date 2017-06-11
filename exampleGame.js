const Rx = require('rxjs');

const game = require('./game');
const { updater, validator, createInitialState } = require('./numberwang');

const players = ['A', 'B'];
const initialState = createInitialState(players);

const incomingTurnA$ = Rx.Observable
  .interval(50)
  .map((x) => x + 1);

const incomingTurnB$ = Rx.Observable
  .interval(25)
  .delay(120)
  .map((x) => -x - 1);

const incomingTurn$ = incomingTurnA$
  .map(n => (
    { from: 'A', data: { type: 'turn', game_id: 'asdf', n } }
  ))
  .merge(incomingTurnB$.map(n => (
    { from: 'B', data: { type: 'turn', game_id: 'asdf', n } }
  )));

const updateEachPlayer$ = incomingTurn$
  .let(game({ players, updater, validator, initialState }))

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