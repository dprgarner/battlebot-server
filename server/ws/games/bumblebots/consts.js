export const BUMBLEBOTS_TICK = 'BUMBLEBOTS_TICK';
export const BUMBLEBOTS_FULL_TIME = 'BUMBLEBOTS_FULL_TIME';
export const BUMBLEBOTS_DISCONNECT = 'BUMBLEBOTS_DISCONNECT';

export const BUMBLEBOTS_TICK_TIME = 250;
export const BUMBLEBOTS_TURN_LIMIT = 100;

export const BUMBLEBOTS_SPAWN_DELAY = 5;
export const BUMBLEBOTS_SETUP_TIME = 15;
export const BUMBLEBOTS_COOLDOWN_TIME = 15;
export const BUMBLEBOTS_TARGET_PROBABILITY = 0.1;

export const BUMBLEBOTS_SPACE_EMPTY = 0;
export const BUMBLEBOTS_SPACE_WALL = 1;
export const BUMBLEBOTS_SPACE_TARGET = 2;
export const BUMBLEBOTS_SPACE_CLAIMED_0 = 5;
export const BUMBLEBOTS_SPACE_CLAIMED_1 = 6;

export const POSSIBLE_MOVES = {
  UL: [-1, -1],
  UR: [-1, 0],
  R: [0, 1],
  DR: [1, 1],
  DL: [1, 0],
  L: [0, -1],
};
