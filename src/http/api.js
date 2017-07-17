import bodyParser from 'body-parser';
import connect from '../db';
import { createRandomHash } from '../hash';
import games from '../games';
import graphQLEndpoint from './graphql';
import { ClientError } from './error';

export default function addApi(app) {
  const jsonParser = bodyParser.json();

  app.post('/bots/:gameName', jsonParser, (req, res, next) => {
    const name = req.body.name;
    const pass_hash = createRandomHash();
    const { bot_id, owner } = req.body;
    const gameName = req.params.gameName;

    Promise.resolve()
      .then(() => {
        if (!games[gameName]) throw new ClientError('Game not recognised');
        if (!bot_id) throw new ClientError('No ID set');
        if (!owner) throw new ClientError('No owner set');
      })
      .then(() => connect(db => {
        const bots = db.collection('bots');

        return bots
          .count({ bot_id })
          .then((count) => {
            if (count) throw new ClientError('Bot already registered with that name');
          })
          .then(() => bots.insertOne({
            game: gameName,
            bot_id,
            pass_hash,
            owner,
            date_registered: new Date(),
          }))
          .then(() => {
            console.log(`Registered ${gameName} bot ${bot_id}`);
            res
              .status(201)
              .json({ game: gameName, bot_id, pass_hash });
          })
      }))
      .catch(next);
  });

  app.get('/bots/:gameType', (req, res, next) => {
    const gameType = req.params.gameType;

    Promise.resolve()
      .then(() => {
        const url = `/graphql?query=%23%20Welcome%20to%20GraphiQL%0A%23%0A%23%20GraphiQL%20is%20an%20in-browser%20tool%20for%20writing%2C%20validating%2C%20and%0A%23%20testing%20GraphQL%20queries.%0A%23%0A%23%20Type%20queries%20into%20this%20side%20of%20the%20screen%2C%20and%20you%20will%20see%20intelligent%0A%23%20typeaheads%20aware%20of%20the%20current%20GraphQL%20type%20schema%20and%20live%20syntax%20and%0A%23%20validation%20errors%20highlighted%20within%20the%20text.%0A%23%0A%23%20GraphQL%20queries%20typically%20start%20with%20a%20%22%7B%22%20character.%20Lines%20that%20starts%0A%23%20with%20a%20%23%20are%20ignored.%0A%23%0A%23%20An%20example%20GraphQL%20query%20might%20look%20like%3A%0A%23%0A%23%20%20%20%20%20%7B%0A%23%20%20%20%20%20%20%20field(arg%3A%20%22value%22)%20%7B%0A%23%20%20%20%20%20%20%20%20%20subField%0A%23%20%20%20%20%20%20%20%7D%0A%23%20%20%20%20%20%7D%0A%23%0A%23%20Keyboard%20shortcuts%3A%0A%23%0A%23%20%20%20%20%20%20%20Run%20Query%3A%20%20Ctrl-Enter%20(or%20press%20the%20play%20button%20above)%0A%23%0A%23%20%20%20Auto%20Complete%3A%20%20Ctrl-Space%20(or%20just%20start%20typing)%0A%23%0A%23%0A%23%20Also%2C%20there%27s%20a%20bug%20where%20the%20query%20fails%20when%20this%20page%20is%20loaded%20via%20a%20direct%20link.%20%0A%23%20Just%20add%20and%20remove%20some%20whitespace%20to%20fix%20this.%0A%0Aquery(%24gameType%3A%20ID!)%20%7B%0A%20%20gameType(id%3A%20%24gameType)%20%7B%0A%20%20%20%20id%0A%20%20%20%20%0A%20%20%20%20bots%20%7B%0A%20%20%20%20%20%20id%0A%20%20%20%20%20%20owner%0A%20%20%20%20%20%20dateRegistered%0A%20%20%20%20%7D%0A%20%20%7D%0A%7D&variables=%7B%0A%20%20%22gameType%22%3A%20%22${gameType}%22%20%0A%7D`;
        res.redirect(url);
      })
      .catch(next);
  });

  app.get('/games/:gameType', (req, res, next) => {
    const gameType = req.params.gameType;

    Promise.resolve()
      .then(() => {
        const url = `/graphql?query=%23%20Welcome%20to%20GraphiQL%0A%23%0A%23%20GraphiQL%20is%20an%20in-browser%20tool%20for%20writing%2C%20validating%2C%20and%0A%23%20testing%20GraphQL%20queries.%0A%23%0A%23%20Type%20queries%20into%20this%20side%20of%20the%20screen%2C%20and%20you%20will%20see%20intelligent%0A%23%20typeaheads%20aware%20of%20the%20current%20GraphQL%20type%20schema%20and%20live%20syntax%20and%0A%23%20validation%20errors%20highlighted%20within%20the%20text.%0A%23%0A%23%20GraphQL%20queries%20typically%20start%20with%20a%20%22%7B%22%20character.%20Lines%20that%20starts%0A%23%20with%20a%20%23%20are%20ignored.%0A%23%0A%23%20An%20example%20GraphQL%20query%20might%20look%20like%3A%0A%23%0A%23%20%20%20%20%20%7B%0A%23%20%20%20%20%20%20%20field(arg%3A%20%22value%22)%20%7B%0A%23%20%20%20%20%20%20%20%20%20subField%0A%23%20%20%20%20%20%20%20%7D%0A%23%20%20%20%20%20%7D%0A%23%0A%23%20Keyboard%20shortcuts%3A%0A%23%0A%23%20%20%20%20%20%20%20Run%20Query%3A%20%20Ctrl-Enter%20(or%20press%20the%20play%20button%20above)%0A%23%0A%23%20%20%20Auto%20Complete%3A%20%20Ctrl-Space%20(or%20just%20start%20typing)%0A%23%0A%23%0A%23%20Also%2C%20there%27s%20a%20bug%20where%20the%20query%20fails%20when%20this%20page%20is%20loaded%20via%20a%20direct%20link.%20%0A%23%20Just%20add%20and%20remove%20some%20whitespace%20to%20fix%20this.%0A%0Aquery(%24gameType%3A%20ID!)%20%7B%0A%20%20gameType(id%3A%20%24gameType)%20%7B%0A%20%20%20%20id%0A%0A%20%20%20%20games(filters%3A%20%7Blimit%3A%2010%7D)%20%7B%0A%20%20%20%20%20%20...%20on%20NoughtsAndCrosses%20%7B%0A%20%20%20%20%20%20%20%20id%0A%20%20%20%20%20%20%20%20startTime%0A%20%20%20%20%20%20%20%20players%20%7B%0A%20%20%20%20%20%20%20%20%20%20id%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20victor%20%7B%0A%20%20%20%20%20%20%20%20%20%20id%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20reason%0A%20%20%20%20%20%20%20%20contest%0A%20%20%20%20%20%20%20%20board%0A%20%20%20%20%20%20%20%20marks%20%7B%0A%20%20%20%20%20%20%20%20%20%20X%20%7B%0A%20%20%20%20%20%20%20%20%20%20%09id%0A%20%20%20%20%20%20%20%20%09%7D%0A%20%20%20%20%20%20%20%20%20%20O%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20id%0A%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%7D%0A%20%20%7D%0A%7D&variables=%7B%0A%20%20%22gameType%22%3A%20%22${gameType}%22%20%0A%7D`;
        res.redirect(url);
      })
      .catch(next);
  });

  app.get('/games/:gameType/:gameId', (req, res, next) => {
    const gameType = req.params.gameType;
    const gameId = req.params.gameId;

    Promise.resolve()
      .then(() => {
        const url = `/graphql?query=%23%20Welcome%20to%20GraphiQL%0A%23%0A%23%20GraphiQL%20is%20an%20in-browser%20tool%20for%20writing%2C%20validating%2C%20and%0A%23%20testing%20GraphQL%20queries.%0A%23%0A%23%20Type%20queries%20into%20this%20side%20of%20the%20screen%2C%20and%20you%20will%20see%20intelligent%0A%23%20typeaheads%20aware%20of%20the%20current%20GraphQL%20type%20schema%20and%20live%20syntax%20and%0A%23%20validation%20errors%20highlighted%20within%20the%20text.%0A%23%0A%23%20GraphQL%20queries%20typically%20start%20with%20a%20%22%7B%22%20character.%20Lines%20that%20starts%0A%23%20with%20a%20%23%20are%20ignored.%0A%23%0A%23%20An%20example%20GraphQL%20query%20might%20look%20like%3A%0A%23%0A%23%20%20%20%20%20%7B%0A%23%20%20%20%20%20%20%20field(arg%3A%20%22value%22)%20%7B%0A%23%20%20%20%20%20%20%20%20%20subField%0A%23%20%20%20%20%20%20%20%7D%0A%23%20%20%20%20%20%7D%0A%23%0A%23%20Keyboard%20shortcuts%3A%0A%23%0A%23%20%20%20%20%20%20%20Run%20Query%3A%20%20Ctrl-Enter%20(or%20press%20the%20play%20button%20above)%0A%23%0A%23%20%20%20Auto%20Complete%3A%20%20Ctrl-Space%20(or%20just%20start%20typing)%0A%23%0A%23%0A%23%20Also%2C%20there%27s%20a%20bug%20where%20the%20query%20fails%20when%20this%20page%20is%20loaded%20via%20a%20direct%20link.%20%0A%23%20Just%20add%20and%20remove%20some%20whitespace%20to%20fix%20this.%0A%0Aquery(%24gameType%3A%20ID!%2C%20%24gameId%3A%20ID!)%20%7B%0A%20%20gameType(id%3A%20%24gameType)%20%7B%0A%20%20%20%20id%0A%20%20%20%20game(id%3A%20%24gameId)%20%7B%0A%20%20%20%20%20%20...on%20NoughtsAndCrosses%20%7B%0A%09%09%09%09id%0A%20%20%20%20%20%20%20%20startTime%0A%20%20%20%20%20%20%20%20contest%0A%20%20%20%20%20%20%20%20players%20%7B%0A%20%20%20%20%20%20%20%20%20%20id%0A%20%20%20%20%20%20%20%20%20%20owner%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20marks%20%7B%0A%09%09%09%09%09X%20%7B%0A%09%09%09%09%09%20%20id%0A%09%09%09%09%09%7D%0A%09%09%09%09%09O%20%7B%0A%09%09%09%09%09%20%20id%0A%09%09%09%09%09%7D%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%0A%20%20%20%20%20%20%20%20victor%20%7B%0A%20%20%20%20%20%20%20%20%20%20id%0A%20%20%20%20%20%20%20%20%7D%20%20%20%20%20%20%20%20%0A%20%20%20%20%20%20%20%20reason%0A%20%20%20%20%20%20%20%20turns%20%7B%0A%20%20%20%20%20%20%20%20%20%20space%0A%20%20%20%20%20%20%20%20%20%20mark%0A%20%20%20%20%20%20%20%20%20%20time%0A%20%20%20%20%20%20%20%20%20%20player%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20id%0A%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%7D%0A%20%20%7D%0A%7D&variables=%7B%0A%20%20%22gameType%22%3A%20%22${gameType}%22%2C%0A%20%20%22gameId%22%3A%20%22${gameId}%22%0A%7D`;
        res.redirect(url);
      })
      .catch(next);
  });

  // This might need to behave differently if the number of games becomes
  // large.
  app.get('/games/:gameType/contests/:contestId', (req, res, next) => {
    const gameType = req.params.gameType;
    const contestId = req.params.contestId;

    Promise.resolve()
      .then(() => {
        const url = `/graphql?query=%23%20Welcome%20to%20GraphiQL%0A%23%0A%23%20GraphiQL%20is%20an%20in-browser%20tool%20for%20writing%2C%20validating%2C%20and%0A%23%20testing%20GraphQL%20queries.%0A%23%0A%23%20Type%20queries%20into%20this%20side%20of%20the%20screen%2C%20and%20you%20will%20see%20intelligent%0A%23%20typeaheads%20aware%20of%20the%20current%20GraphQL%20type%20schema%20and%20live%20syntax%20and%0A%23%20validation%20errors%20highlighted%20within%20the%20text.%0A%23%0A%23%20GraphQL%20queries%20typically%20start%20with%20a%20"%7B"%20character.%20Lines%20that%20starts%0A%23%20with%20a%20%23%20are%20ignored.%0A%23%0A%23%20An%20example%20GraphQL%20query%20might%20look%20like%3A%0A%23%0A%23%20%20%20%20%20%7B%0A%23%20%20%20%20%20%20%20field(arg%3A%20"value")%20%7B%0A%23%20%20%20%20%20%20%20%20%20subField%0A%23%20%20%20%20%20%20%20%7D%0A%23%20%20%20%20%20%7D%0A%23%0A%23%20Keyboard%20shortcuts%3A%0A%23%0A%23%20%20%20%20%20%20%20Run%20Query%3A%20%20Ctrl-Enter%20(or%20press%20the%20play%20button%20above)%0A%23%0A%23%20%20%20Auto%20Complete%3A%20%20Ctrl-Space%20(or%20just%20start%20typing)%0A%23%0A%23%0A%23%20Also%2C%20there%27s%20a%20bug%20where%20the%20query%20fails%20when%20this%20page%20is%20loaded%20via%20a%20direct%20link.%20%0A%23%20Just%20add%20and%20remove%20some%20whitespace%20to%20fix%20this.%0A%0Aquery(%24gameType%3A%20ID!%2C%20%24contest%3A%20ID!)%20%7B%0A%20%20gameType(id%3A%20%24gameType)%20%7B%0A%20%20%20%20id%0A%09%09contest(id%3A%20%24contest)%20%7B%0A%20%20%20%20%20%20id%0A%20%20%20%20%20%20rankings%20%7B%0A%20%20%20%20%20%20%20%20bot%20%7B%0A%20%20%20%20%20%20%20%20%20%20id%0A%20%20%20%20%20%20%20%20%20%20owner%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20score%0A%20%20%20%20%20%20%20%20wins%0A%20%20%20%20%20%20%20%20draws%0A%20%20%20%20%20%20%20%20losses%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20games%20%7B%0A%20%20%20%20%20%20%20%20...on%20NoughtsAndCrosses%20%7B%0A%20%20%20%20%20%20%20%20%20%20id%0A%20%20%20%20%20%20%20%20%20%20players%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20id%0A%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%20%20victor%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20id%0A%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%20%20reason%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%7D%0A%20%20%7D%0A%7D&variables=%7B%0A%20%20"gameType"%3A%20"${gameType}"%2C%0A%20%20"contest"%3A%20"${contestId}"%0A%7D`;
        res.redirect(url);
      })
      .catch(next);
  });

  app.use('/graphql', graphQLEndpoint);
}
