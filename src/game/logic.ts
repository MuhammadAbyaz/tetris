export {
  BUFFER_ROWS,
  createGame,
  createSevenBag,
  DEFAULT_BASE_GRAVITY_MS,
  DEFAULT_MIN_GRAVITY_MS,
  fallSpeedCellsPerSecond,
  GARBAGE_COLOR,
  Game,
  GRAVITY_CURVE_BASE,
  GRAVITY_CURVE_STEP,
  gravityMsForLevel,
  LINE_CLEAR_ANIMATION_MS,
  LINE_CLEAR_SCORES,
  LINES_PER_LEVEL,
  LOCK_DELAY_MS,
  LOCK_RESET_LIMIT,
  PIECE_COLORS,
  PIECE_TYPES,
  SOFT_DROP_POINTS,
  HARD_DROP_POINTS,
  COMBO_POINTS_PER_LEVEL,
  BACK_TO_BACK_MULTIPLIER,
  SPRINT_LINE_TARGET,
  ULTRA_TIME_LIMIT_MS,
  VISIBLE_COLS,
  VISIBLE_ROWS,
  classifyClear,
  scoreClear,
  detectTSpin,
} from './engine';
export type {
  ActivePiece,
  Cell,
  ClearType,
  GameOptions,
  GameOverReason,
  GravityCurveOptions,
  LockResult,
  LockedCell,
  PieceType,
  PlayMode,
  TimerDisplay,
  TimerKind,
} from './engine';
export { createModeGame, MODE_TITLES, modeDefaults } from './modes';

export interface GameConfig {
  readonly boardWidth: number;
  readonly boardHeight: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  boardWidth: 10,
  boardHeight: 20,
};

export function createEmptyBoard(config: GameConfig = DEFAULT_CONFIG): number[][] {
  return Array.from({ length: config.boardHeight }, () =>
    Array.from({ length: config.boardWidth }, () => 0),
  );
}
