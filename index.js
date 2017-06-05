// https://ws4py.readthedocs.io/en/latest/sources/managertutorial/
// https://stackoverflow.com/questions/3142705/is-there-a-websocket-client-implemented-for-python
// https://ws4py.readthedocs.io/en/latest/sources/ws4py/

// const WebSocket = require('ws');
// const socket$ = new Rx.Subject();
// const wss = new WebSocket.Server({ port: 8080 });

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