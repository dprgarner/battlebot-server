const _ = require('underscore');
const Rx = require('rxjs');

function addCancelRequest(timeout) {
  return incoming$ => incoming$
    .flatMap(data => Rx.Observable
      .of(data)
      .concat(Rx.Observable
        .timer(timeout)
        .mapTo({ cancel: data })
      )
    );
}

function collateWaitingPlayers() {
  return incoming$ => incoming$
    .scan((acc, inc) => {
      const requests = _.extend({}, acc.requests);
      let newGame = null;

      if (inc.cancel) {
        const { player, params } = inc.cancel;
        requests[player] = _.filter(
          requests[player], reqPlayer => reqPlayer !== params
        );
        return { requests, newGame };
      }

      const { player, params } = inc;
      requests[player] = (requests[player] || []).concat([params]);

      const waiting = _.chain(requests)
        .pick((val, key) => val.length)
        .keys()
        .value();

      if (waiting.length >= 2) {
        newGame = waiting.splice(0, 2);
        requests[newGame[0]].pop();
        requests[newGame[1]].pop();
      }
      console.log(requests, newGame);
      return { requests, newGame };
    });
}

function newGameRequests(gameName) {
  return incoming$ => incoming$
    .filter(({ data: { type, game }}) => (
      type === 'request_game' && game === gameName
    ))
    .map(({ from, data: { params } }) => ({ player: from, params }))
    .let(addCancelRequest(10000))
    .startWith({ requests: {}, newGame: null })
    .let(collateWaitingPlayers())
    .filter(({ newGame }) => newGame)
    .map(({ newGame }) => newGame)
}

module.exports = newGameRequests;