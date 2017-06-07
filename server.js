// https://ws4py.readthedocs.io/en/latest/sources/managertutorial/
// https://stackoverflow.com/questions/3142705/is-there-a-websocket-client-implemented-for-python
// https://ws4py.readthedocs.io/en/latest/sources/ws4py/

const Rx = require('rxjs');
const WebSocket = require('ws');

function createWebsocketSubject(ws) {
  const observer = {
    next: (x) => ws.send(x),
    error: (err) => ws.close(1, err),
    complete: () => ws.close(0),
  };

  const observable = Rx.Observable.create(observer => {
    ws.on('message', (data) => observer.next(data));
    ws.on('error', (err) => observer.error(err));
    ws.on('close', () => observer.complete());

    return () => ws.close();
  }).share();

  return Rx.Subject.create(observer, observable);
}

// A stream of WebSocket subjects.
const ws$ = new Rx.Observable.create(observer => {
  console.log('Opening a server...');
  const wss = new WebSocket.Server({ port: 8080 });

  wss.on('connection', (ws) => {
    observer.next(createWebsocketSubject(ws));
  });

  return () => wss.close(err => {
    if (err) console.error(err);
    console.log('Server Closed');
  });
}).share();

ws$.subscribe(x => console.log('New socket'));

const incoming$ = ws$.mergeAll();
incoming$.subscribe(x => console.log(x));
incoming$.subscribe(x => console.log(x));
