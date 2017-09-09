import {
  ApolloClient,
  ApolloProvider,
  createNetworkInterface,
} from 'react-apollo';

import { ThemeProvider } from 'styled-components';
import { render } from 'react-dom';
import 'normalize.css';

import Page from 'client/components/Page';

const networkInterface = createNetworkInterface({
  uri: '/graphql',
});
const client = new ApolloClient({ networkInterface });

const theme = {
  background: '#e0e0e0',
  border: '1px solid #888',
};

function App() {
  return (
    <ApolloProvider client={client}>
      <ThemeProvider theme={theme}>
        <Page />
      </ThemeProvider>
    </ApolloProvider>
  );
}

window.onload = () => {
  render(<App />, document.getElementById('app'));
};
