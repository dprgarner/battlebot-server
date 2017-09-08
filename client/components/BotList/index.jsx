import styled from 'styled-components';
import { gql, graphql } from 'react-apollo';

import ArticleBox from 'battlebots-client/components/ArticleBox';
import StatusWrapper from 'battlebots-client/components/StatusWrapper';
import getBotList from './query.gql';

const HeaderText = styled.h3`
  margin: 0;
  font-size: 20px;
`;

function BotList({ data: { bots } }) {
  return (
    <ArticleBox>
      <HeaderText>Noughts and Crosses bots:</HeaderText>
      <ul>
        { bots.map(({ name, owner }) => (
          <li key={name}>
            { `${name} (${owner})` }
          </li>
        )) }
      </ul>
    </ArticleBox>
  );
}

export default graphql(getBotList)(StatusWrapper(BotList));
