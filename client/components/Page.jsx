import styled from 'styled-components';

import ArticleBox from 'battlebots-client/components/ArticleBox';
import BotList from 'battlebots-client/components/BotList';

const Body = styled.div`
  height: calc(100vh - 40px);
  padding: 20px;
`;

export default function Page() {
  return (
    <Body>
      <BotList />
      <ArticleBox>
        <a href="https://github.com/dprgarner/battlebot-server">
          { 'Github page for the Battlebot Server' }
        </a>
      </ArticleBox>
    </Body>
  );
}
