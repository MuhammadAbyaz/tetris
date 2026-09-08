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
