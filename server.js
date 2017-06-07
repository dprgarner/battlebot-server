// https://ws4py.readthedocs.io/en/latest/sources/managertutorial/
// https://stackoverflow.com/questions/3142705/is-there-a-websocket-client-implemented-for-python
// https://ws4py.readthedocs.io/en/latest/sources/ws4py/

const Rx = require('rxjs');
const WebSocket = require('ws');

const ws$ = new Rx.Observable.create(observer => {
  console.log('Opening a server...');
  const wss = new WebSocket.Server({ port: 8080 });

  wss.on('connection', (ws) => {
    observer.next(ws);
  });

  return () => wss.close(err => {
    console.log('Server Closed');
  });
}).share();

const sub = ws$.subscribe(x => console.log('new socket'));
const sub2 = ws$.subscribe(x => console.log('new socket 2'));

setTimeout(() => {
  sub.unsubscribe();
  sub2.unsubscribe();
}, 5000);

setTimeout(() => {
  ws$.subscribe(x => console.log('new socket'));
}, 8000);

// // On receiving a message, wait half a second and then reverse the string.
// wss.on('connection', (socket) => {
//   socket$.next(socket);
// });

// socket$.subscribe(socket => {
//   socket.on
// })

  // ws.on('message', function incoming(message) {
  //   console.log('received: %s', message);

  //   setTimeout(() => {
  //     ws.send(message.split('').reverse().join(''));
  //   }, 500)
  //   ws.send('something');
  // });

// const obs = Rx.Observable
//   .interval(250)
//   .map(x => 2 * x)
//   .take(5)

// const subscription = obs.subscribe(x => console.log(x));

// console.log(subscription);
// setTimeout(() => subscription.unsubscribe(), 750);

// const subject = new Rx.Subject();

// subject.subscribe({
//   next: v => console.log('1:', v),
//   complete: () => console.log('1: complete'),
//   error: e => console.error('1: oh no', e),
// });
// setTimeout(() => {
//   subject.subscribe({
//     next: v => console.log('2:', v),
//     complete: () => console.log('2: complete'),
//   error: e => console.error('2: oh no', e),
//   });
// }, 100);

// subject.next(1);

// setTimeout(() => {
//   subject.next(2);
// }, 500);
// setTimeout(() => {
//   subject.next(3);
// }, 1000);

// setTimeout(() => {
//   subject.error('oaisdiouasdh');
// }, 1100);