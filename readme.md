[![Build Status](https://travis-ci.org/dprgarner/battlebot-server.svg?branch=master)](https://travis-ci.org/dprgarner/battlebot-server)[![codecov](https://codecov.io/gh/dprgarner/battlebot-server/branch/master/graph/badge.svg)](https://codecov.io/gh/dprgarner/battlebot-server)

# Battlebot server

This is a server for AI battles! The idea is that client bots connect to the server via WebSockets and play each other in turn-based abstract strategy games, with the server managing and validating the games and recording the results.

It's currently being hosted on Heroku: https://blunderdome-server.herokuapp.com/

Server code is located here: https://github.com/dprgarner/battlebot-server

A boilerplate Python Client is located here: https://github.com/dprgarner/battlebot-client-py

## Overview

Before playing games, a new bot must first be registered with the server, which involves making a POST request to an API, specifying the name of the bot and (optionally) its owner, and saving the login credentials returned by the request. A registered bot is associated to a single type of game.

```bash
> curl -X POST http://blunderdome-server.herokuapp.com/bots/numberwang -H "Content-Type: application/json" -d '{ "bot": "MyAwesomeBot", "owner": "David" }'
{
  "game": "numberwang",
  "bot": "MyAwesomeBot",
  "password": "8ad86f2934f346abf60ee7c192c96fbc838a54273c4c092de7ae97153b84d934"
}
```

To play a game, the bot should connect to the server via a (secure) WebSocket and authenticate itself in its first message to the server. The message should contain the name of the bot, the game that the bot plays, and its password. If the authentication fails, the server will (attempt to) send `{ "authentication": "failed" }` and then close the connection. If the authentication succeeds, the server will respond with a confirmation message.

```javascript
// To the server:
{
  "game": "numberwang",
  "bot": "MyAwesomeBot",
  "password": "8ad86f2934f346abf60ee7c192c96fbc838a54273c4c092de7ae97153b84d934"
}

// From the server:
{
  "authentication": "OK",
  "game": "numberwang",
  "bot": "MyAwesomeBot"
}
```

Once a client has successfully authenticated itself, the server will then either immediately match up the bot with an available connected bot, or wait until another bot connects, or disconnect after a few minutes.

Once a game starts, the server will send an update to both bots containing the initial state of the game in the key `state`, including the starting game board and the next player to move. The structure of this object is specific to the particular game, but it will always include the list `bots` of the bots playing the game, a list `waitingFor` of bots that the server is expecting a move from, and a boolean `complete` stating whether the game is still in progress. For a two-player abstract strategy game, `waitingFor` will only ever contain a single bot.

When it is a bot's turn to move, the bot should send a turn to the server over the WebSocket. The format of the turn will be specific to the game, but it should always be valid JSON, and should not need to reference the game name or the bot name (as this is already known the server).

The server will then reply with an object containing the keys `state` and `turn`. The `turn` will be the most recently attempted turn, but will also include the extra data of the player that made the turn `player`, the `time` the turn was made, and the boolean `valid` stating whether the turn was valid or not. If the move is invalid, then this update is sent only to the bot which attempted the invalid move, along with the (unchanged) state of the game. If the move is valid, then the turn and new state of the game will be sent to both bots.

Once the game ends, the server will attempt to send a final update to both bots containing the final state of the board, and then close both connections. The final state of the board will contain the boolean key `complete` set to true, the key `victor` set to the ID of the winning bot, or null if the game ends in a draw, and the key `reason` stating how the game was decided. A game can be completed normally, but can also end if a bot is disqualified by disconnecting early, making three invalid turns during the course of the game, or taking longer than three seconds to take a turn. If an error is thrown by the server during the running of the game, then the game will (hopefully) be recorded as a draw.

## Codebase

The WebSocket server is implemented in JavaScript with [RxJS 5](https://github.com/ReactiveX/rxjs), an implementation of the [Reactive Extensions](http://reactivex.io/) design pattern/framework. The HTTP site is written with [Express](https://expressjs.com/).

The server saves registered bots and completed games to a MongoDB database.

To start the server, start up a MongoDB server, and run `npm start` with the port and MongoDB URI in the env variables:
```
MONGODB_URI=mongodb://localhost:27017/battlebots PORT=3000 npm start
```

### Creating Games
A game can be added simply by dropping a new file into `./games`. This will create the API registration endpoint `/bots/newgame`, and will start saving registered bots and finished games to the database.

A game module must export a function `validate (State, Turn) => Bool` which, for given state and turn objects, must return a boolean of whether the move should be accepted as valid or not. This should also check that the player attempting to make the turn is the nextPlayer.

The game module must also export a function `reducer (State, Turn) => State`, which creates the new state of the game from the existing state of the game. This new state must contain `players`, `nextPlayer`, and `complete`. The reducer should also record the `reason` the game ended.

### Tests

Not much going on, here. There's some tests for the Noughts and Crosses game, and an end-to-end test, but most of the code is untested.

### APIs

There's a [GraphQL](http://graphql.org/learn/) API. 
The interactive tool GraphiQL is located [here](https://blunderdome-server.herokuapp.com/graphql?query%3D%2523%2520Welcome%2520to%2520GraphiQL%250A%2523%250A%2523%2520GraphiQL%2520is%2520an%2520in-browser%2520tool%2520for%2520writing%252C%2520validating%252C%2520and%250A%2523%2520testing%2520GraphQL%2520queries.%250A%2523%250A%2523%2520Type%2520queries%2520into%2520this%2520side%2520of%2520the%2520screen%252C%2520and%2520you%2520will%2520see%2520intelligent%250A%2523%2520typeaheads%2520aware%2520of%2520the%2520current%2520GraphQL%2520type%2520schema%2520and%2520live%2520syntax%2520and%250A%2523%2520validation%2520errors%2520highlighted%2520within%2520the%2520text.%250A%2523%250A%2523%2520GraphQL%2520queries%2520typically%2520start%2520with%2520a%2520%2522%257B%2522%2520character.%2520Lines%2520that%2520starts%250A%2523%2520with%2520a%2520%2523%2520are%2520ignored.%250A%2523%250A%2523%2520An%2520example%2520GraphQL%2520query%2520might%2520look%2520like%253A%250A%2523%250A%2523%2520%2520%2520%2520%2520%257B%250A%2523%2520%2520%2520%2520%2520%2520%2520field%28arg%253A%2520%2522value%2522%29%2520%257B%250A%2523%2520%2520%2520%2520%2520%2520%2520%2520%2520subField%250A%2523%2520%2520%2520%2520%2520%2520%2520%257D%250A%2523%2520%2520%2520%2520%2520%257D%250A%2523%250A%2523%2520Keyboard%2520shortcuts%253A%250A%2523%250A%2523%2520%2520%2520%2520%2520%2520%2520Run%2520Query%253A%2520%2520Ctrl-Enter%2520%28or%2520press%2520the%2520play%2520button%2520above%29%250A%2523%250A%2523%2520%2520%2520Auto%2520Complete%253A%2520%2520Ctrl-Space%2520%28or%2520just%2520start%2520typing%29%250A%2523%250A%2523%250A%2523%2520Also%252C%2520there%2527s%2520a%2520bug%2520where%2520the%2520query%2520fails%2520when%2520this%2520page%2520is%2520loaded%2520via%2520a%2520direct%2520link.%2520%250A%2523%2520Adding%2520and%2520removing%2520some%2520whitespace%2520and%2520running%2520the%2520query%2520again%2520fixes%2520this.%250A%250A%257B%250A%2520%2520gameType%28name%253A%2520%2522noughtsandcrosses%2522%29%2520%257B%250A%2520%2520%2520%2520name%250A%250A%2520%2520%2520%2520contest%28name%253A%2520%2522blunderdome%2522%29%2520%257B%250A%2520%2520%2520%2520%2520%2520name%250A%250A%2520%2520%2520%2520%2520%2520games%28filters%253A%2520%257Bplayers%253A%2520%255B%2522IdiotBot%2522%252C%2520%2522ExpertBot%2522%255D%257D%29%2520%257B%250A%2520%2520%2520%2520%2520%2520%2520%2520...%2520on%2520NoughtsAndCrosses%2520%257B%250A%2520%2520%2520%2520%2520%2520%2520%2520%2520%2520victor%2520%257B%250A%2520%2520%2520%2520%2520%2520%2520%2520%2520%2520%2520%2520id%250A%2520%2520%2520%2520%2520%2520%2520%2520%2520%2520%257D%250A%2520%2520%2520%2520%2520%2520%2520%2520%2520%2520reason%250A%2520%2520%2520%2520%2520%2520%2520%2520%257D%250A%2520%2520%2520%2520%2520%2520%257D%250A%250A%2520%2520%2520%2520%2520%2520ambitious%253A%2520rankings%2520%257B%250A%2520%2520%2520%2520%2520%2520%2520%2520bot%2520%257B%250A%2520%2520%2520%2520%2520%2520%2520%2520%2520%2520id%250A%2520%2520%2520%2520%2520%2520%2520%2520%257D%250A%2520%2520%2520%2520%2520%2520%2520%2520score%250A%2520%2520%2520%2520%2520%2520%2520%2520wins%250A%2520%2520%2520%2520%2520%2520%2520%2520draws%250A%2520%2520%2520%2520%2520%2520%2520%2520losses%250A%2520%2520%2520%2520%2520%2520%257D%250A%2520%2520%2520%2520%2520%2520%250A%2520%2520%2520%2520%2520%2520balanced%253A%2520rankings%28method%253A%2520%2522balanced%2522%29%2520%257B%250A%2520%2520%2520%2520%2520%2520%2520%2520bot%2520%257B%250A%2520%2520%2520%2520%2520%2520%2520%2520%2520%2520id%250A%2520%2520%2520%2520%2520%2520%2520%2520%257D%250A%2520%2520%2520%2520%2520%2520%2520%2520score%250A%2520%2520%2520%2520%2520%2520%257D%250A%2520%2520%2520%2520%2520%2520%250A%2520%2520%2520%2520%2520%2520punitive%253A%2520rankings%28method%253A%2520%2522punitive%2522%29%2520%257B%250A%2520%2520%2520%2520%2520%2520%2520%2520bot%2520%257B%250A%2520%2520%2520%2520%2520%2520%2520%2520%2520%2520id%250A%2520%2520%2520%2520%2520%2520%2520%2520%257D%250A%2520%2520%2520%2520%2520%2520%2520%2520score%250A%2520%2520%2520%2520%2520%2520%257D%250A%2520%2520%2520%2520%257D%250A%2520%2520%257D%250A%257D%26operationName%3Dnull).

## Games

### Noughts and Crosses

The initial state of a game is of this form:
```javascript
{
  "state": {
    "bots": [
      "IdiotBot2",
      "IdiotBot"
    ],
    "complete": false,
    "board": [
      ["", "", ""],
      ["", "", ""],
      ["", "", ""]
    ],
    "waitingFor": ["IdiotBot2"],
    "marks": {
      "X": "IdiotBot2",
      "O": "IdiotBot"
    }
  }
}
```

A turn dispatched from the client to the server should specify the mark to place and the space to place it in. A space is specified as a two-entry array, with each entry an integer from 0 to 2, specifying the row and column to place the mark in respectively.  The mark should be "O" or "X", depending on whether the client is playing "X"es or "O"s.

```javascript
{ "mark": "X", "space": [2, 2] }
```

The following is an example of a server response, at the end of the game,
including the last valid turn:

```javascript
{
  "turn": {
    "bot": "IdiotBot2",
    "valid": true,
    "space": [1, 2],
    "time": 1498036964996,
    "mark": "X"
  },
  "state": {
    "complete": true,
    "bots": [
      "IdiotBot2",
      "IdiotBot"
    ],
    "reason": "complete",
    "board": [
      ["O", "O", "X"],
      ["X", "O", "X"],
      ["O", "X", "X"]
    ],
    "marks": {
      "X": "IdiotBot2",
      "O": "IdiotBot"
    },
    "waitingFor": [],
    "victor": "IdiotBot2"
  }
}
```

## Development

Download Docker and Docker Compose. Build and start the servers with:

```bash
docker-compose up
```

## TODO

- Keep writing them tests

Next game:
- Create an out-stream for spectator updates
- Simple spectator stream page (dump JSON for now)
-- Maybe try GraphQL subscriptions and Apollo because it's hip and trendy
-- Closed information updates
- Start with Rock-Paper-Scissors
- How can Victor allow for a more forgiving pattern?
-- Perhaps Victor patterns should be game-specific.