import _ from 'underscore';

import { SOCKET_INCOMING } from 'battlebots/ws/consts';

import * as bumblebots from '.';
import * as orders from './orders';
import * as utils from './utils';
import { initialState } from './testUtils';

describe('Bumblebots (general)', () => {
  describe('createOutgoing', () => {
    it('returns a representation of the full state to each bot', () => {
      const state = {
        ...initialState,
        drones: {
          BotOne: { A: [7, 7] },
          BotTwo: { Z: [8, 7] },
        },
      };
      const expectedState = _.omit(
        state,
        'turns',
        'connected',
        'spawnDue',
        'droneNames',
      );
      expect(bumblebots.createOutgoing(state)).toEqual({
        BotOne: expectedState,
        BotTwo: expectedState,
      });
    });
  });
});
