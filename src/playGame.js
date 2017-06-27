const _ = require('underscore');
const Rx = require('rxjs/Rx');

const connect = require('./db');
const games = require('./games');

const { createShortRandomHash } = require('./hash');
const { wsObserver, wsObservable } = require('./sockets');

function runGame(validator, reducer) {
  // This function transforms a stream of incoming turns into a stream of updates,
  // validating the turns and updating the state of the game.

  // The 'reducer' can in general be non-deterministic (make random calls),
  // so every scan must be evaluated EXACTLY once, regardless of the
  // subscriptions. (Hence the shareReplay.)
  return incoming$ => incoming$
    .scan(({ state: oldState }, turn) => {
      let valid = false;
      let state = oldState;
      try {
        valid = validator(oldState, turn);
      } catch (e) {
        console.error(e);
      }
      if (valid) {
        state = reducer(oldState, turn);
      }
      turn.valid = valid;
      return { state, turn };
    })
    .shareReplay();
}

function getVictor(connections, update$) {
  // Create a stream which emits a single item when a winner is decided. 
  // The winner can be determined by the game finishing (normally or
  // abnormally), by timeout, disconnection, or by a bot repeatedly making
  // invalid turns.
  const gracePeriod = 500;
  const strikes = 3;
  const timeout = 3000;

  const players = _.pluck(connections, 'botId');

  function otherPlayer(player) {
    return _.without(players, player)[0]
  }

  const reasonComplete = 'complete';
  const reasonDisconnected = 'disconnect';
  const reasonTimeout = 'timeout';
  const reasonIdiocy = "Didn't write unit tests";

  return Rx.Observable.of(
    // Game concluded normally (or abnormally)
    update$
      .filter(({ state: { complete } }) => complete)
      .map(({ state: { victor, reason } }) => (
        { victor, reason: reason || reasonComplete }
      )),

    // One player disconnected
    ...connections.map(({ ws, botId }) => (
      wsObservable(ws)
        .ignoreElements()
        .delay(gracePeriod)
        .concat(Rx.Observable.of({
          victor: otherPlayer(botId),
          reason: reasonDisconnected,
        }))
    )),

    // Both players disconnected (within gracePeriod ms of each other)
    Rx.Observable.from(connections)
      .concatMap(({ ws }) => wsObservable(ws).ignoreElements())
      .concat(Rx.Observable.of({
        victor: null,
        reason: reasonDisconnected,
      })),

    // Player repeatedly makes invalid turns
    ...players.map((player) => (
      update$
        .filter(({ turn }) => turn && turn.player == player && !turn.valid)
        .concat(Rx.Observable.never())
        .take(strikes)
        .ignoreElements()
        .concat(Rx.Observable.of({
          victor: otherPlayer(player),
          reason: reasonIdiocy,
        }))
        .delay(5)
    )),

    // The next player fails to make a valid move within the timeout period
    update$
      .filter(({ turn }) => !turn || turn.valid)
      .timeout(timeout)
      .concat(Rx.Observable.never())
      .catch(e => Rx.Observable.empty())
      .last()
      .map(({ state: { nextPlayer } }) => ({
        victor: otherPlayer(nextPlayer),
        reason: reasonTimeout,
      }))
  )
  .mergeAll()
  .take(1)
  .delay(5)
  .shareReplay();
}

function addLastTurn(update$) {
  return update$
    .takeWhile(({ state: { complete } }) => !complete)
    .concat(update$
      .skipWhile(({ state: { complete } }) => !complete)
      .take(1)
    );
}

function playGame(connections) {
  const gameName = connections[0].game;
  const game = games[gameName];
  const gameId = createShortRandomHash();
  const players = _.pluck(connections, 'botId');

  const startTime = new Date();

  console.log(
    `${gameId}: A game of ${gameName} has started between ${players[0]} and ${players[1]}.`
  );

  const update$ = Rx.Observable.from(connections)
    .flatMap(({ ws, botId }) => wsObservable(ws)
      .map(turn => _.extend({}, turn, { player: botId, time: Date.now() }))
    )
    .startWith({ state: game.createInitialState(players) })
    .let(runGame(game.validator, game.reducer))
    .let(addLastTurn)
    .catch(e => {
      return Rx.Observable.of({
        state: { complete: true, victor: null, reason: `Error -- ${e.message}` }
      });
    });

  const victor$ = getVictor(connections, update$);

  // Create a final update of the game if the game ends in an exceptional way
  const updateWithConclusion$ = update$
    .takeUntil(victor$)
    .concat(victor$
      .withLatestFrom(update$, ({ victor, reason }, finalUpdate) => {
        if (finalUpdate.state.complete) return;
        return { state: _.extend({}, finalUpdate.state, {
          complete: true,
          victor,
          reason,
        })};
      })
      .filter(x => x)
    )

  // Save completed game to database
  Rx.Observable.zip(
    updateWithConclusion$
      .filter(update => update.turn && update.turn.valid)
      .reduce((acc, { turn }) => {
        const parsedTurn = _.omit(turn, 'valid');
        parsedTurn.time = new Date(parsedTurn.time);
        return acc.concat(parsedTurn)
      }, []),

    updateWithConclusion$.last(),

    (turns, finalState) => _.extend(
      {},
      _.omit(finalState.state, 'complete', 'nextPlayer'),
      { _id: gameId, turns, startTime, game: gameName }
    )
  )
  .subscribe(gameRecord => {
    const text = gameRecord.victor ? 
      `${gameRecord.victor} has won a game of ${gameName}.` :
      `The ${gameName} game between ${players[0]} and ${players[1]} ended in a draw.`;
    console.log(`${gameId}: ${text} (Reason: ${gameRecord.reason})`);

    // TODO parse gameRecord more carefully for MongoDB, i.e replace date
    // numbers with Date objects

    connect(db => db.collection('games').insertOne(gameRecord))
      .then((res) => {
        console.log(`${gameId}: Game saved to database`);
      })
      .catch((err) => {
        console.error(`${gameId}: Could not log game to database`);
        console.error(err);
      })
  });

  // Dispatch relevant updates to the connected websockets
  connections.forEach(({ ws, botId }) => {
    updateWithConclusion$
      .filter(({ turn }) => (!turn || turn.valid || turn.player === botId))
      .subscribe(wsObserver(ws));
  })
}

module.exports = playGame;
