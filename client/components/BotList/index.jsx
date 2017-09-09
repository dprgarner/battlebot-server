import styled from 'styled-components';
import { gql, graphql } from 'react-apollo';

import StatusWrapper from 'client/components/StatusWrapper';
import getBotList from './query.gql';

const HeaderText = styled.h3`
  margin: 0;
  font-size: 20px;
`;

function BotList({ data: { bots } }) {
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

export default graphql(getBotList)(StatusWrapper(BotList));
