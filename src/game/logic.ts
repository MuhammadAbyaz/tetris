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
  LINE_CLEAR_SCORES,
  LINES_PER_LEVEL,
  PIECE_COLORS,
  PIECE_TYPES,
  SOFT_DROP_POINTS,
  HARD_DROP_POINTS,
  COMBO_POINTS_PER_LEVEL,
  BACK_TO_BACK_MULTIPLIER,
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
} from './engine';

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
