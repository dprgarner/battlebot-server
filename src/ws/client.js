import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000', {
  perMessageDeflate: false
});

ws.on('open', () => {
  console.log('ws openend');

  setTimeout(() => ws.send('{"lol": "gg"}'), 1000);
});

ws.on('message', (data) => {
  console.log('received: ', data);
});

ws.on('close', () => {
  console.log('ws close');
});

ws.on('error', (err) => {
  console.error(err);
});
