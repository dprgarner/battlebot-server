const gameTypes = ['noughtsandcrosses'];

const typeDefs = `
  type GameType {
    name: String!
    games: [Game]
    bots: [Bot]
  }

  type Bot {
    id: String!
    gameType: GameType!
    owner: String!
    dateRegistered: String
  }

  interface Game {
    id: String!
    gameType: GameType!
    players: [Bot]
    victor: Bot
    reason: String!
    contest: String
  }

  type NoughtsAndCrosses implements Game {
    id: String!
    gameType: GameType!
    players: [Bot]
    victor: Bot
    reason: String!
    contest: String

    board: [[String]]
    startTime: String!
    contest: String!
    marks: NoughtsAndCrossesMarks!
    turns: [NoughtsAndCrossesTurn]!
  }

  type NoughtsAndCrossesMarks {
    X: Bot!
    O: Bot!
  }

  type NoughtsAndCrossesTurn {
    space: [Int]!
    mark: String!
    time: String!
    player: Bot!
  }

  type Query {
    gameTypes: [GameType]
    gameType(name: String!): GameType
  }
`;

module.exports = { gameTypes, typeDefs };
