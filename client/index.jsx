import styled from 'styled-components';

import React from 'react';
import { render } from 'react-dom';

import 'normalize.css';

const Body = styled.div`
  height: calc(100vh - 100px);
  padding: 50px;
`;

const BigContainer = styled.article`
  background-color: #e0e0e0;
  border-radius: 15px;
  border: 1px solid #888;
  padding: 30px;
`;

function App() {
  return (
    <Body>
      <BigContainer>
        <a href="https://github.com/dprgarner/battlebot-server">
          { 'Github page for the Battlebot Server' }
        </a>
      </BigContainer>
    </Body>
  );
}

window.onload = () => {
  render(<App />, document.getElementById('app'));
};
