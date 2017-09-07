import React from 'react';
import { render } from 'react-dom';

import 'normalize.css';

window.onload = () => {
  render(
    <div>
      <a href="https://github.com/dprgarner/battlebot-server">
      { 'Github page for the Battlebot Server' }
      </a>
    </div>,
    document.getElementById('app')
  );
};
