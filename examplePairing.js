const _ = require('underscore');
const Rx = require('rxjs');

function addCancelRequest() {
  return incoming$ => incoming$
    .flatMap(data => Rx.Observable
      .of(data)
      .concat(Rx.Observable
        .timer(1000)
        .mapTo(
          { type: 'cancel_request_game', game: 'numberwang', params: data.params }
        )
      )
    );
}

const incomingReqA$ = Rx.Observable
  .interval(50)
  .delay(10)
  .take(3)
  .map(() => ({ type: 'request_game', game: 'numberwang', params: {} }))
  .let(addCancelRequest())
  .map(data => ({ from: 'A', data }))

const incomingReqB$ = Rx.Observable
  .interval(25)
  .delay(120)
  .take(2)
  .map(() => ({ type: 'request_game', game: 'numberwang', params: {} }))
  .let(addCancelRequest())
  .map(data => ({ from: 'B', data }))

const incoming$ = incomingReqA$
  .merge(incomingReqB$)

const numberwangRequest$ = incoming$
  .filter(({ data: { type, game }}) => (
    (type === 'request_game' || type === 'cancel_request_game') && game === 'numberwang'
  ))
  .startWith({ requests: {}, newGame: null })
  .scan((acc, { from, data: { type, params } }) => {
    const requests = _.extend({}, acc.requests);

    let newGame = null;
    if (type === 'cancel_request_game') {
      requests[from] = _.filter(requests[from], reqPlayer => reqPlayer !== params);
      return { requests, newGame };
    }
    requests[from] = (requests[from] || []).concat([params]);

    const waiting = _.chain(requests)
      .pick((val, key) => val.length)
      .keys()
      .value();

    if (waiting.length >= 2) {
      newGame = waiting.splice(0, 2);  // mutates waiting
      requests[newGame[0]].pop();
      requests[newGame[1]].pop();
    }
    return { requests, newGame };
  })
  .subscribe(x => console.log(JSON.stringify(x)))

// firstDistinctPair(['A', 'A', 'B'])
//   .subscribe(x => console.log(x));