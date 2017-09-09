import {
  ApolloClient,
  ApolloProvider,
  createNetworkInterface,
} from 'react-apollo';

import { render } from 'react-dom';
import 'normalize.css';

import Page from 'client/components/Page';

const networkInterface = createNetworkInterface({
  uri: '/graphql',
});

const client = new ApolloClient({ networkInterface });

function App() {
  return (
    <ApolloProvider client={client}>
      <Page />
    </ApolloProvider>
  );
}

window.onload = () => {
  render(<App />, document.getElementById('app'));
};
