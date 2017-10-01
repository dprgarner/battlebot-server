import styled from 'styled-components';
import { gql, graphql } from 'react-apollo';
import moment from 'moment';

import * as Grid from 'client/components/Grid';
import withStatus from 'client/components/withStatus';
import withHandleScroll from 'client/components/withHandleScroll';

import GET_GAME_LIST from './query.gql';

const GameCard = styled.section`
  border: ${props => props.theme.border};
  height: 250px;
  margin: 10px;
  padding: 5px;
`;

function GameList({ data: { games = [] } }) {
  return (
    <Grid.Container>
      { games.map(({ id, bots, result: { victor }, startTime, contest }) => (
        <Grid.Item key={id}>
          <GameCard>
            <h4>
              { moment(startTime).format('DD/MM/YYYY HH:mm:ss') }
            </h4>
            <div>
              { victor && bots[0].name === victor.name ? (
                <b>
                  { bots[0].name }
                </b>
              ) : bots[0].name }
              { ' - ' }
              { victor && bots[1].name === victor.name ? (
                <b>
                  { bots[1].name }
                </b> 
              ) : bots[1].name }
            </div>
            { contest ? (
              <p>
                { `Contest: ${contest.name}` }
              </p>
            ) : null }
          </GameCard>
        </Grid.Item>
      )) }
    </Grid.Container>
  );
}

export default graphql(GET_GAME_LIST, {
  options: {
    notifyOnNetworkStatusChange: true,
  },

  props: ({ data }) => ({
    data,

    handleScroll: () => data.games && !data.loading ? data.fetchMore({
      variables: {
        offset: data.games.length,
      },

      updateQuery: (prev, { fetchMoreResult }) => (
        fetchMoreResult ? {
          ...prev,
          games: [...prev.games, ...fetchMoreResult.games],
        } : prev
      ),
    }) : null,
  })
})(withHandleScroll(withStatus(GameList)));
