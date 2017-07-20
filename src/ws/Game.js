import Rx from 'rxjs';
import makeWsDriver, { CLOSE, INCOMING, OUTGOING }  from './sockets';

export default function Game(sources) {
  const props$ = sources.props;

  const tick$ = Rx.Observable.interval(1000);

  return {
    complete: props$.switchMap(props =>
      sources.ws.filter(({ type, socketId }) => (
        type === INCOMING && socketId === props.sockets[0].socketId
      ))
      .take(3)
      .ignoreElements()
      .concat(Rx.Observable.of(props))
    ),

    ws: props$.switchMap(props => {
      const game = props.game;
      const [player1, player2] = props.sockets;

      return tick$.flatMap(i => Rx.Observable.from([
        {
          type: OUTGOING,
          socketId: player1.socketId,
          payload: { tick: i },
        },
        {
          type: OUTGOING,
          socketId: player2.socketId,
          payload: { tick: i },
        },
      ]))
    }),
  };
}