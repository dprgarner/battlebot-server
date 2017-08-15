import _ from 'underscore';
import Rx from 'rxjs';

import Victor from './Victor';
import games from '../games';
import makeWsDriver, { CLOSE, INCOMING, OUTGOING }  from './sockets';
import { createShortRandomHash } from '../hash';

const DB_SAVEGAME = 'savegame';

function runGame(validator, reducer) {
  // This function transforms a stream of incoming turns into a stream of updates,
  // validating the turns and updating the state of the game.

  // The 'reducer' can in general be non-deterministic (make random calls),
  // so every scan must be evaluated EXACTLY once, regardless of the
  // subscriptions. (Hence the shareReplay.)
  return incoming$ => {
    const update$ = incoming$.scan(({ state: oldState }, turn) => {
      let valid = false;
      let state = oldState;
      let log = null;
      try {
        valid = validator(oldState, turn);
      } catch (e) {
        log = e.message;
      }
      if (valid) {
        state = reducer(oldState, turn);
      }
      turn.valid = valid;
      return { state, turn, log };
    })
    .shareReplay();

    return {
      update: update$.map(({ state, turn }) => ({ state, turn })),
      log: update$.map(({ log }) => log).filter(msg => msg),
    };
  };
}

function addLastTurn(update$) {
  return update$
    .takeWhile(({ state: { result } }) => !result)
    .concat(update$
      .skipWhile(({ state: { result } }) => !result)
      .take(1)
    );
}

function saveToDatabase(finalUpdate$) {
  return finalUpdate$.map(gameRecord => ({
    type: DB_SAVEGAME,
    id: gameRecord._id,
    gen: db => db.collection('games').insertOne(gameRecord),
  }))
}

export default function Game(sources) {
  const props = sources.props;

  const gameId = createShortRandomHash();
  const gameType = props.gameType;
  const contest = props.contest;
  const gameReducer = runGame(
    games[gameType].validator, games[gameType].reducer
  );

  const bots = _.pluck(props.sockets, 'name');
  const startTime = new Date();

  const logGameStart$ = Rx.Observable.of(
    `${gameId}: ` +
    `A game of ${gameType} has started between ${bots[0]} and ${bots[1]}.`
  );

  const game = gameReducer(
    Rx.Observable.from(props.sockets)
      .flatMap(({ socketId, name }) =>
        sources.ws.filter(({ type, socketId: id }) => (
          type === INCOMING && socketId === id
        ))
        .map(({ payload }) => (
          {...payload, name, time: Date.now() }
        ))
      )
      .startWith({ state: games[gameType].createInitialState(bots) })
  );
  const update$ = game.update;
  // TODO clean up all the game-ending stuff :(
  const victor$ = Victor({ props, ws: sources.ws, update: update$ }).victor;

  // Create a final update of the game if the game ends in an exceptional way
  const updateWithConclusion$ = update$
    .takeUntil(victor$)
    .concat(
      victor$
      .withLatestFrom(update$, (result, finalUpdate) => {
        if (finalUpdate.state.result) return;
        return {
          state: { ...finalUpdate.state, result },
        };
      })
      .filter(x => x)
    );

  // Save completed game to database
  // TODO extract out a function for collating the relevant turns from the
  // game record?
  const finalState$ = Rx.Observable.zip(
    updateWithConclusion$
      .filter(update => update.turn && update.turn.valid)
      .reduce((acc, { turn }) => {
        const parsedTurn = _.omit(turn, 'valid');
        parsedTurn.time = new Date(parsedTurn.time);
        return acc.concat(parsedTurn)
      }, []),

    updateWithConclusion$.last(),

    (turns, finalState) => _.extend(
      _.pick({ contest }, _.identity),
      _.omit(finalState.state, 'waitingFor'),
      { _id: gameId, gameType, turns, startTime }
    )
  );
  const dbUpdate$ = saveToDatabase(finalState$);

  const logDbSuccess$ = sources.db
    .first(({ request: { type, id } }) => (
      type === DB_SAVEGAME && gameId === id
    ))
    .flatMap(response$ => response$
      .ignoreElements()
      .concat(Rx.Observable.of(`${response$.request.id}: Game saved to database`))
      .catch((err) => {
        return Rx.Observable.from([
          `${response$.request.id}: Could not save game to database`,
          `${response$.request.id}: ${err.message}`,
        ])
      })
    );

  const logGameEnd$ = finalState$.map((state) => {
    const { _id, gameType, bots, result: { victor, reason } } = state;
    const text = victor ?
      `${victor} has won a game of ${gameType}.` :
      `The ${gameType} game between ${bots[0]} and ${bots[1]} ended in a draw.`;
    return `${_id}: ${text} (Reason: ${reason})`;
  });

  const wsUpdate$ = Rx.Observable.from(props.sockets)
    .flatMap(({ name, socketId }) => updateWithConclusion$
      .filter(({ turn }) => (!turn || turn.valid || turn.name === name))
      .map(payload => ({ type: OUTGOING, socketId, payload }))
    );

  const wsClose$ = finalState$.ignoreElements()
    .delay(10)
    .concat(
      Rx.Observable.from(props.sockets)
        .map(({ socketId }) => ({ type: CLOSE, socketId }))
    );

  return {
    complete: Rx.Observable.merge(
      wsClose$,
      logDbSuccess$,
    )
    .ignoreElements(),

    ws: Rx.Observable.merge(wsUpdate$, wsClose$),

    db: dbUpdate$,

    log: Rx.Observable.merge(
      logGameStart$,
      logGameEnd$,
      logDbSuccess$,
    ),
  };
}