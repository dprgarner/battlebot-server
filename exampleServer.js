const Rx = require('rxjs');
const createAuthenticatedServer = require('./server');


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

createAuthenticatedServer(incoming$ => incoming$.let(createGame(
  { 
    players: ['botName', 'otherBotName'],
    reducer,
    validator,
  }
)));

// createAuthenticatedServer(incoming$ => (
//   incoming$
//     .delay(1000)
//     .combineLatest(
//       Rx.Observable.of(1,2,3),
//       ({ from: id, data: { number } }, x) => (
//         { to: id, data: { number: x + number }}
//       )
//     )
// ));