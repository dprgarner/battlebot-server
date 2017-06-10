const Rx = require('rxjs');

const createAuthenticatedServer = require('./server');
const game = require('./game');

const initialState = { nextPlayer: 'botName', complete: false, count: 0 };

function updater(state = initialState, player, turn) {
  if (!turn) return state;
  // if (Math.random() < 0.1) throw new Error('bad reducing' + JSON.stringify(state));

  const count = state.count + turn.n;
  return {
    nextPlayer: state.nextPlayer === 'botName' ? 'otherBotName' : 'botName',
    count,
    complete: Math.abs(count) >= 5,
  };
}

function validator(state, player, turn) {
  // if (Math.random() < 0.5) throw new Error('bad validation');
  return player === state.nextPlayer && typeof(turn.n) === 'number';
}

createAuthenticatedServer(incoming$ => incoming$.let(game(
  {
    players: ['botName', 'otherBotName'],
    updater,
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