import styled from 'styled-components';
import { gql, graphql } from 'react-apollo';

import withStatus from 'client/components/withStatus';
import GET_BOT_LIST from './query.gql';

const HeaderText = styled.h3`
  margin: 0;
  font-size: 20px;
`;

function BotList({ data: { bots = []} }) {
  return (
    <ul>
      { bots.map(({ name, owner }) => (
        <li key={name}>
          { `${name} (${owner})` }
        </li>
      )) }
    </ul>
  );
}

export default graphql(GET_BOT_LIST)(withStatus(BotList));
