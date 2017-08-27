import {
  BUMBLEBOTS_SETUP_TIME,
  BUMBLEBOTS_COOLDOWN_TIME,
  BUMBLEBOTS_TARGET_PROBABILITY,
} from './const';

export function generateRandomEvents(state) {
  const { turnNumber, board } = state;
  const events = [];
  if (
    turnNumber > BUMBLEBOTS_SETUP_TIME &&
    turnNumber < (BUMBLEBOTS_TURN_LIMIT - BUMBLEBOTS_COOLDOWN_TIME)
  ) {
    // Generate a new target.
    if (Math.random() < BUMBLEBOTS_TARGET_PROBABILITY) {

      const availablePositions = getPossibleTargetSites
      return true;
      // events.push({ })
    }
  }
}
