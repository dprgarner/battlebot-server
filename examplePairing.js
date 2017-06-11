const _ = require('underscore');
const Rx = require('rxjs');

const newGameRequests = require('./matchmaking');

const incomingReqA$ = Rx.Observable
  .interval(50)
  .delay(10)
  .take(1)
  .map(() => ({ type: 'request_game', game: 'numberwang', params: {} }))
  .map(data => ({ from: 'A', data }))

const incomingReqB$ = Rx.Observable
  .interval(25)
  .delay(120)
  .take(1)
  .map(() => ({ type: 'request_game', game: 'numberwang', params: {} }))
  .map(data => ({ from: 'B', data }))

const incoming$ = incomingReqA$
  .merge(incomingReqB$)

const gameRequest$ = incoming$
  .let(newGameRequests('numberwang'))

gameRequest$.subscribe(x => console.log('1', x));
gameRequest$.subscribe(x => console.log('2', x));

// firstDistinctPair(['A', 'A', 'B'])
//   .subscribe(x => console.log(x));