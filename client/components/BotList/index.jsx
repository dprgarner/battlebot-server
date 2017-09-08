import styled from 'styled-components';
import { gql, graphql } from 'react-apollo';

import ArticleBox from 'battlebots-client/components/ArticleBox';
import getBotList from './query.graphql';

const HeaderText = styled.h3`
  margin: 0;
  font-size: 20px;
`;

function BotList(props) {
  const { loading, error, bots } = props.data;

  if (loading) {
    return <span>Loading...</span>;
  }
  if (error) {
    return <span>{ error.message }</span>;
  }

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

export default graphql(getBotList)(BotList);
