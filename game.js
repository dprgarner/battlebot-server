const Rx = require('rxjs/Rx');

function game({ reducer, validator }) {
  // This function transforms the incomingTurn$ stream into the update$
  // stream.
  return incomingTurn$ => {
    // There's a cyclic dependency of streams, here, so something needs to be
    // a subject.
    const validTurn$ = new Rx.Subject();

    // The initial game state comes from an empty call to reducer.
    // I'd prefer it if the reducer was pure... but just in case there's some
    // inherent randomness in it, the state stream must be shared by all
    // observers.
    const state$ = validTurn$
      .startWith(reducer())
      .scan(reducer)
      .share();

    // Validate each turn against the current state of the game.
    // This must be wrapped in a try/catch to stop an unscrupulous
    // player from deliberately crashing the game with an invalid action.
    const update$ = incomingTurn$
      .withLatestFrom(state$, (turn, state) => {
        let valid = false;
        try {
          valid = validator(state, turn);
        } catch (e) {}
        return { turn, valid, state };
      })
      .share();

    // Emits the final state of the game, and closes.
    const gameComplete$ = state$
      .skipWhile(state => !state.complete)
      .take(1);

    // Feed valid turns back into the validTurn$ subject.
    const validTurnSubscription = update$
      .filter(({ valid }) => valid)
      .map(({ turn }) => turn)
      .subscribe(validTurn$);

    // Unsubscribe from validTurn$ when the game ends. This ends all
    // subscriptions to incomingTurns$... seems a little odd, though.
    gameComplete$.subscribe(
      () => validTurnSubscription.unsubscribe(),
      err => validTurnSubscription.unsubscribe()
    );

    // Return a stream of all the attempted turns, with their validity and
    // resulting state.
    return update$
      .merge(incomingTurn$.ignoreElements())
      .takeUntil(gameComplete$)
  }
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

  // if (Math.random() < 0.1) throw new Error('bad reducing', state);
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
  e => console.log('argh!', e.message),
  x => console.log('done')
);

setTimeout(() => { console.log('okay')}, 1000);
