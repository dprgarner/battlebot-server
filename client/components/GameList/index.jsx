import styled from 'styled-components';
import { gql, graphql } from 'react-apollo';

import * as Grid from 'client/components/Grid';
import getGameList from './query.gql';
import statusWrapper from 'client/components/statusWrapper';

const GameCard = styled.section`
  border: ${props => props.theme.border};
  height: 250px;
  margin: 10px;
  padding: 5px;
`;

function GameList({ data: { games }}) {
  return (
    <Grid.Container>
      { games.map(({ id, bots }) => (
        <Grid.Item key={id}>
          <GameCard>
            <h4>
              {`Game ${id}`}
            </h4>
            <span>
              {`Bots: ${bots.map(({ name }) => name).join(', ')}`}
            </span>
          </GameCard>
        </Grid.Item>
      )) }
    </Grid.Container>
  );
}

export default graphql(getGameList)(statusWrapper(GameList));
