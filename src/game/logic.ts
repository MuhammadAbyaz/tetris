export {
  BUFFER_ROWS,
  createGame,
  createSevenBag,
  GARBAGE_COLOR,
  Game,
  LINE_CLEAR_SCORES,
  PIECE_COLORS,
  PIECE_TYPES,
  VISIBLE_COLS,
  VISIBLE_ROWS,
} from './engine';
export type { ActivePiece, Cell, GameOptions, LockResult, LockedCell, PieceType } from './engine';

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
