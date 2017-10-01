[![Build Status](https://travis-ci.org/dprgarner/battlebot-server.svg?branch=master)](https://travis-ci.org/dprgarner/battlebot-server)[![codecov](https://codecov.io/gh/dprgarner/battlebot-server/branch/master/graph/badge.svg)](https://codecov.io/gh/dprgarner/battlebot-server)

# Battlebot server

This is a server for AI battles! The idea is that client bots connect to the server via WebSockets and play each other in turn-based abstract strategy games, with the server managing and validating the games and recording the results.

It's currently being hosted on Heroku: https://blunderdome-server.herokuapp.com/

Server code is located here: https://github.com/dprgarner/battlebot-server

A boilerplate Python Client is located here: https://github.com/dprgarner/battlebot-client-py

## Overview

Before playing games, a new bot must first be registered with the server, which involves making a POST request to an API, specifying the name of the bot, the game the bot plays, and its owner. A registered bot is associated to a single type of game. When the request is successful, an automatically-generated password is returned, which should be stored for authenticating the bot in the future. The API is implemented in GraphQL, with the schema [here](https://github.com/dprgarner/battlebot-server/blob/master/src/http/graphql/schema.graphql).

```bash
> cat request.json
{"query": "
  mutation {
    registerBot(gameType: NOUGHTS_AND_CROSSES, name: \"MyAwesomeBot\", owner: \"David\") {
      password
      bot {
        name
        owner
        gameType {
          name
        }
        dateRegistered
      }
    }
  }
"}
> curl -X POST http://blunderdome-server.herokuapp.com/graphql -H "Content-Type: application/json" --data "@request.json"
{
  "data": {
    "registerBot": {
      "password": "a8831f4c15a48adf38219c3828b385f0d6427b5c5c3fe4bfdfb9c279bc79c438",
      "bot": {
        "name": "MyAwesomeBot",
        "owner": "David",
        "gameType": NOUGHTS_AND_CROSSES,
        "dateRegistered": "Sun Aug 06 2017 19:04:03 GMT+0100 (GMT Daylight Time)"
      }
    }
  }
}

```

To play a game, the bot should connect to the server via a (secure) WebSocket and authenticate itself in its first message to the server. The message should contain the name of the bot, the game that the bot plays, and its password. The message can also optionally contain the name of a contest. If the authentication fails, the server will (attempt to) send `{ "authentication": "failed" }` and then close the connection. If the authentication succeeds, the server will respond with a confirmation message.

```javascript
// To the server:
{
  "gameType": "NOUGHTS_AND_CROSSES",
  "name": "MyAwesomeBot",
  "password": "8ad86f2934f346abf60ee7c192c96fbc838a54273c4c092de7ae97153b84d934"
}

// From the server:
{
  "authentication": "OK",
  "gameType": "NOUGHTS_AND_CROSSES",
  "name": "MyAwesomeBot"
}
```

Once a client has successfully authenticated itself, the server will then either immediately match up the bot with an available connected bot, or wait until another bot connects, or disconnect after a few minutes.

Once a game starts, the server will send an update to both bots containing the initial state of the game in the key `state`, including the starting game board and the next player to move. The structure of this object is specific to the particular game.

When it is a bot's turn to move, the bot should send a turn to the server over the WebSocket. The format of the turn will be specific to the game, but it should always be valid JSON, and should not need to reference the game name or the bot name, as these are already known by the server. The server will then reply with an object containing the state of the game.

Once the game ends, the server will attempt to send a final update to both bots containing the final state of the board, and then close both connections. The final state of the board will contain the object `result`, with the key `victor` set to the ID of the winning bot or null if the game ends in a draw, and the key `reason` stating how the game was decided. A game can be completed normally, but can also end if a bot is disqualified by disconnecting early, making three invalid turns during the course of the game, or taking longer than five seconds to take a turn.

## Contests

To play a bot in a contest, the bot should add the name of a contest to its authentication JSON message:

```javascript
// To the server:
{
  "gameType": "NOUGHTS_AND_CROSSES",
  "name": "MyAwesomeBot",
  "password": "8ad86f2934f346abf60ee7c192c96fbc838a54273c4c092de7ae97153b84d934",
  "contest": "EpicTournament"
}

// From the server:
{
  "authentication": "OK",
  "gameType": "NOUGHTS_AND_CROSSES",
  "name": "MyAwesomeBot",
  "contest": "EpicTournament"
}
```

When a bot joins the server to play a tournament, it will only play other bots playing in the same tournament, and it will only play each bot in the tournament a set number of times (currently five games each way).

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
    "board": [
      ["", "", ""],
      ["", "", ""],
      ["", "", ""]
    ],
    "waitingFor": ["IdiotBot2"],
    "result": null,
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

The server will respond with an object containing the key `state` with the new state of the game, and `turn` containing the most recently attempted turn. The `turn` object will also include the extra data of the player that made the turn, the time the turn was made, and the boolean `valid` stating whether the turn was valid or not. If the move is invalid, then this update is sent only to the bot which attempted the invalid move, along with the (unchanged) state of the game. If the move is valid, then the turn and new state of the game will be sent to both bots.

The following is an example of a server response, at the end of the game, including the last valid turn:

```javascript
{
  "turn": {
    "name": "IdiotBot2",
    "valid": true,
    "space": [1, 2],
    "time": 1498036964996,
    "mark": "X"
  },
  "state": {
    "result": {
      "complete": true,
      "victor": "IdiotBot2"
    },
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
    "waitingFor": []
  }
}
```

### Bumblebots

Bumblebots is a turn-based real-time strategy game with a Bumblebee theme. Your drones have to navigate a hexagonal arena and stake out the randomly-appearing flowers before the other bot's drones reach them. Once a drone reaches a flower, the drone claims the flower and vanishes, and the area around the flower becomes impassible to the opponent's drones. The bot which claims the most flowers during the game is the winner.

The game processes moves in 'ticks', with each tick time currently set to 250ms. When the game starts and after each subsequent tick, the server will send an update to the connected bots containing the current positions of the drones and the current layout of the board. The connected bots can send orders to the server at any time, which will be resolved simultaneously at the next tick time. A bot can choose to move any or all of its drones within a single tick. If a received drone order is missing, or invalid, or involves collisions with walls or other drones, then the order is ignored, and the drone does not move. There is no penalty for missing or invalid orders. The game ends after a set number of ticks, currently set to 100.

New flowers will appear in the arena during a game. When a drone reaches a flower, the drone will 'occupy the flower' (leave play), and the tile with the flower will be converted into a wall. Any empty spaces adjacent to the claimed flower will become safe zones for the bot. Only drones belonging to that bot can move through the safe zone. A new drone will spawn in the starting positions to replace this drone after 5 turns, provided that there is an empty spawn point. No flowers will appear in the first 15 ticks or the last 15 ticks of the game, and flowers will not spawn in a bot's safe zone or in walls.

The game board is hexagonal. This is represented in the state object as a 2d array, where the position in the 2d array corresponds to the position in the hexagonal arena relative to axes parallel to the top left corner. In the array representation, `0` refers to empty space, `1` refers to walls, `2` to flowers, `5` to safe areas for the first player, and `6` to safe areas for the second player. An example board with a string-formatted representation is shown below, with `#` for walls, `.` for empty space, `£` for flowers, and `+`/`x` for safe zones. (The JavaScript unit tests and the Python client use the same convention for rendering the board as a string.)

```javascript
// String representation:
`
              #   #   #   #   #   #   #   #
            #   .   .   +   +   +   .   .   #
          #   .   .   .   .   .   .   .   .   #
        #   .   .   #   #   .   #   #   .   .   #
      #   .   .   #   £   .   .   .   #   .   .   #
    #   .   .   .   .   .   .   .   .   .   .   .   #
  #   .   .   #   .   .   .   .   .   .   #   .   .   #
#   .   .   #   .   .   .   .   .   .   .   #   £   .   #
  #   .   .   #   .   .   .   .   .   .   #   .   .   #
    #   .   .   .   .   .   .   .   .   .   .   .   #
      #   .   .   #   .   .   .   .   #   .   .   #
        #   £   .   #   #   .   #   #   .   .   #
          #   .   .   .   .   .   .   .   .   #
            #   .   .   x   x   x   .   .   #
              #   #   #   #   #   #   #   #
`
// Array representation:
[
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 5, 5, 5, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1],
  [1, 0, 0, 1, 2, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 1],
  [ , 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  [ ,  , 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [ ,  ,  , 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1],
  [ ,  ,  ,  , 1, 2, 0, 1, 1, 0, 1, 1, 0, 0, 1],
  [ ,  ,  ,  ,  , 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [ ,  ,  ,  ,  ,  , 1, 0, 0, 6, 6, 6, 0, 0, 1],
  [ ,  ,  ,  ,  ,  ,  , 1, 1, 1, 1, 1, 1, 1, 1],
]
```

The drones and the board are returned separately in the state object. When sending orders to the server, the order is expected to be a JSON object with a single key `orders` containing the names of the drones as keys and a string specifying the direction to move. The six possible strings specifying direction are `UL`, `UR`, `R`, `DR`, `DL`, or `L`. (The drone will stay in place if no string is specified, or if the string is not recognised).

Drone moves are processed simultaneously at tick time - there is no advantage to submitting a turn before the opponent. If any drones attempt to move into a wall or an opponent's safe zone, then the move is cancelled. If any two drones attempt to move into the same space, then the move is cancelled. It is still possible, however, for drones to move in a line, or even a circle, if all drone moves in the procession are unblocked.

An example update sent from the server:
```javascript
{
  "result": null,
  "turnNumber": 0,
  "score": {
    "Bumble1": 0,
    "Bumble2": 0
  },
  "spawnPoints": {
    "Bumble1": [
      [1, 3],
      [1, 4],
      [1, 5]
    ],
    "Bumble2": [
      [13, 11],
      [13, 10],
      [13, 9]
    ]
  },
  "drones": {
    "Bumble1": {
      "SensitiveIvy": {
        "position": [1, 5]
      },
      "PowerfulWilla": {
        "position": [1, 4]
      },
      "AgreeableLeah": {
        "position": [1, 3]
      }
    },
    "Bumble2": {
      "FoolishEsther": {
        "position": [13, 9]
      },
      "MoodyClaudia": {
        "position": [13, 10]
      },
      "CantankerousBetsy": {
        "position": [13, 11]
      }
    }
  },
  "territory": {
    "Bumble1": 5,
    "Bumble2": 6
  },
  "board": [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 5, 5, 5, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1],
    [1, 0, 0, 1, 2, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ],
    [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1 ],
    [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 1 ],
    [null, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1 ],
    [null, null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ],
    [null, null, null, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1 ],
    [null, null, null, null, 1, 2, 0, 1, 1, 0, 1, 1, 0, 0, 1 ],
    [null, null, null, null, null, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1 ],
    [null, null, null, null, null, null, 1, 0, 0, 6, 6, 6, 0, 0, 1 ],
    [null, null, null, null, null, null, null, 1, 1, 1, 1, 1, 1, 1, 1]
  ],
  "maxDrones": 3,
  "bots": [
    "Bumble1",
    "Bumble2"
  ]
}
```

An example update sent to the server from the bot `Bumble`:
```javascript
{
  "SensitiveIvy": "L",
  "PowerfulWilla": "DR",
  "AgreeableLeah": "UR"
}
```

## Development

The WebSocket server is implemented in JavaScript with [RxJS 5](https://github.com/ReactiveX/rxjs), an implementation of the [Reactive Extensions](http://reactivex.io/) design pattern/framework. The HTTP site is written with [Express](https://expressjs.com/).

The server saves registered bots and completed games to a MongoDB database.

To start the server, start up a MongoDB server, and run `npm start` with the port and MongoDB URI in the env variables:
```
MONGODB_URI=mongodb://localhost:27017/battlebots PORT=3000 npm start
```

Alternatively, download Docker and Docker Compose, and build and start the servers with:
```bash
docker-compose up
```

### Implementing new games
Games are exported in `./src/games/index.js`. Each game module must export the functions `createInitialUpdate`, `reducer`, `sideEffects`, and `getDbRecord`.

The function `createInitialUpdate : [BotNames] -> State` takes in the array of bot names and returns the initial state of the game.

The function `reducer : (Acc, Update) -> Acc` takes in the previous accumulated value representing the state and any new updates. The accumulated value must contain the state of the game at the top level, which should have a key `result` which is null until the game has ended. When the reducer updates, any messages in `Acc.outgoing` are dispatched to the clients.

The function `sideEffects : Event$ -> Update$ ` is a map on RxJS streams. It takes in the output of the reducer AND any new updates from the clients. It should return a stream of side-effect events to be consumed by the reducer (e.g. time-dependent events).

The function `getDbRecord : { gameId, startTime, contest, state } -> Obj` takes in the data of the game, and should return a MongoDB-indexable representation of the game to be saved to the database.

### Tests

There are some unit tests and some end-to-end tests.

The unit tests are implemented in Jest, primarily for some utility functions and for the Noughts and Crosses game implementation.

The end-to-end tests are run with `npm run e2e`. This requires MongoDB to be installed locally. The tests create a test database at "mongod://localhost/test_db", spin up the server in a subprocess, register bots and play Noughts and Crosses games, checking that the games are saved to the test database.

### APIs

All non-websocket API requests are served by the [GraphQL](http://graphql.org/learn/) API. 
The interactive tool GraphiQL is located [here](https://blunderdome-server.herokuapp.com/graphql).

## TODO

Bumblebots:
- GraphQL stuff:
  * Create an out-stream for spectator updates
  * Simple spectator stream page (dump JSON for now)
  * Maybe try GraphQL subscriptions and Apollo because it's hip and trendy

- Randomise starting arena
  * Size
  * Starting positions
  * Existing walls
  * Number of drones

- Things that will make the game better:
  * Record when a bot does not get a move in
  * Record when a bot makes an invalid move
  * Record when a bot makes a valid move but gets blocked by another bot
