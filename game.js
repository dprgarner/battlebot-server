const Rx = require('rxjs/Rx');

function game({ reducer, validator }) {
  // This function transforms the incomingTurn$ stream into the update$
  // stream.
  return incomingTurn$ => {
    // There's a cyclic dependency of streams, here, so something needs to be
    // a subject.
    const validTurn$ = new Rx.Subject();

    // The initial game state comes from an empty call to reducer.
    const state$ = validTurn$
      .startWith(reducer())
      .scan(reducer);

    // Emits the final state of the game, and closes.
    const gameComplete$ = state$
      .skipWhile(state => !state.complete)
      .take(1);

    // Validate each turn against the current state of the game.
    const turnWithValidity$ = incomingTurn$
      .withLatestFrom(state$, (turn, state) => ({
        turn,
        valid: validator(state, turn),
      }))
      .share();

    // Feed valid turns back into the validTurn$ subject.
    const validTurnSubscription = turnWithValidity$
      .filter(({ valid }) => valid)
      .map(({ turn }) => turn)
      .subscribe(validTurn$);

    // Unsubscribe from validTurn$ when the game ends. This ends all
    // subscriptions to incomingTurns$... seems a little odd, though.
    gameComplete$.subscribe(() => validTurnSubscription.unsubscribe());

    // Return a stream of all the attempted turns, with their validity and
    // resulting state.
    return turnWithValidity$
      .withLatestFrom(state$, ({ turn, valid }, state) => (
        { turn, valid, state }
      ))
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
  .map((x) => -x);

const incomingTurn$ = incomingTurnA$
  .map(turn => ({ player: 'A', turn }))
  .merge(incomingTurnB$.map(turn => ({ player: 'B', turn })))
  .take(5).concat(Rx.Observable.throw(new Error('bang')))

function reducer(state = { nextPlayer: 'A', complete: false, count: 0 }, turn) {
  if (!turn) return state;
  return {
    nextPlayer: state.nextPlayer === 'A' ? 'B' : 'A',
    count: state.count + turn.turn,
    complete: Math.abs(state.count) >= 10,
  };
}

function validator(state, turn) {
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

updatesA$.subscribe(x => console.log('A:', x, '\n'));
updatesB$.subscribe(
  x => console.log('B:', x, '\n'),
  e => console.log('argh!', e),
  x => console.log('done')
);