import {
  createGame,
  SPRINT_LINE_TARGET,
  ULTRA_TIME_LIMIT_MS,
  type Game,
  type GameOptions,
  type PlayMode,
} from './engine';

export { SPRINT_LINE_TARGET, ULTRA_TIME_LIMIT_MS };
export type { PlayMode };

export const MODE_TITLES: Record<PlayMode, string> = {
  marathon: 'Marathon',
  sprint: 'Sprint',
  ultra: 'Ultra',
  zen: 'Zen',
  versus: 'Versus',
};

const SHARED_PLAY_OPTIONS: GameOptions = {
  nextQueueSize: 5,
  dasMs: 167,
  arrMs: 33,
  gravityMs: 800,
  softDropMs: 40,
};

export function modeDefaults(mode: PlayMode): GameOptions {
  switch (mode) {
    case 'sprint':
      return { mode, lineTarget: SPRINT_LINE_TARGET };
    case 'ultra':
      return { mode, timeLimitMs: ULTRA_TIME_LIMIT_MS };
    case 'zen':
      return { mode, noFail: true };
    case 'versus':
      return { mode: 'versus' };
    default:
      return { mode: 'marathon' };
  }
}

export function createModeGame(mode: PlayMode, options: GameOptions = {}): Game {
  return createGame({ ...SHARED_PLAY_OPTIONS, ...modeDefaults(mode), ...options, mode });
}
