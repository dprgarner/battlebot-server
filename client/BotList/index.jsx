import styled from 'styled-components';
import { gql, graphql } from 'react-apollo';

import ArticleBox from 'battlebots-client/ArticleBox';

const HeaderText = styled.h3`
  margin: 0;
  font-size: 20px;
`;

const getBotList = gql`
  query botList {
    bots(gameType: NOUGHTS_AND_CROSSES) {
      name
      owner
    }
  }
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
