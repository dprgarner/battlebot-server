import styled from 'styled-components';
import {
  ApolloClient,
  ApolloProvider,
  createNetworkInterface,
} from 'react-apollo';
import { render } from 'react-dom';
import 'normalize.css';

import ArticleBox from 'battlebots-client/ArticleBox';
import BotList from 'battlebots-client/BotList';

const Body = styled.div`
  height: calc(100vh - 40px);
  padding: 20px;
`;

function Root() {
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

const networkInterface = createNetworkInterface({
  uri: '/graphql',
});

const client = new ApolloClient({ networkInterface });

function App() {
  return (
    <ApolloProvider client={client}>
      <Root />
    </ApolloProvider>
  );
}

window.onload = () => {
  render(<App />, document.getElementById('app'));
};
