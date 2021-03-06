import styled from 'styled-components';

import ArticleBox from 'client/components/ArticleBox';
import Spinner from 'client/components/Spinner';
import GameList from 'client/components/GameList';

const HeaderText = styled.h1`
  font-size: 30px;
  margin-left: 15px;
`;

export default function Main() {
  return (
    <div>
      <HeaderText>
        Noughts and Crosses Games
      </HeaderText>
      <GameList />
    </div>
  );
}
