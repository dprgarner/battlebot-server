const gameTypes = ['noughtsandcrosses'];

const typeDefs = `
  # The type of the game.
  type GameType {
    # The name of the game. Lower-case.
    name: String!

    # A list of played games.
    games: [Game]

    # A list of the bots registered for this game.
    bots: [Bot]
  }

  type Bot {
    # The name of the bot.
    id: String!

    # The game type that this bot is registered for.
    gameType: GameType!

    # The creator of the bot. Defaults to "Anonymous".
    owner: String!

    dateRegistered: String
  }

  # A played game.
  interface Game {
    id: String!
    gameType: GameType!
    players: [Bot]
    victor: Bot
    reason: String!
    contest: String
  }

  # A played game of Noughts and Crosses.
  type NoughtsAndCrosses implements Game {
    id: String!
    gameType: GameType!
    players: [Bot]
    victor: Bot
    reason: String!
    contest: String

    # The final layout of the board. The outer array is an array of 
    # rows, the inner array is an array of columns.
    board: [[String]]

    # The time that the game started.
    startTime: String!

    # The contest that this game was played in, if any.
    contest: String!
  
    # Which bot played X and which bot played O.
    marks: NoughtsAndCrossesMarks!

    # The list of turns.
    turns: [NoughtsAndCrossesTurn]!
  }

  type NoughtsAndCrossesMarks {
    # This bot played "X"s.
    X: Bot!

    # This bot played "O"s.
    O: Bot!
  }

  type NoughtsAndCrossesTurn {
    # The position of the move, in the form [<row>, <col>], starting at 0.
    space: [Int]!

    # The mark played (X or O).
    mark: String!

    # The time that the move was played.
    time: String!

    # The bot that made the move.
    player: Bot!
  }

  type Query {
    gameTypes: [GameType]
    gameType(name: String!): GameType
  }
`;

module.exports = { gameTypes, typeDefs };
