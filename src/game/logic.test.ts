import { describe, expect, it } from 'vitest';
import { createEmptyBoard, DEFAULT_CONFIG } from './logic';

describe('createEmptyBoard', () => {
  it('creates a board with the default dimensions, all cells empty', () => {
    const board = createEmptyBoard();

    expect(board).toHaveLength(DEFAULT_CONFIG.boardHeight);
    expect(board[0]).toHaveLength(DEFAULT_CONFIG.boardWidth);
    expect(board.flat().every((cell) => cell === 0)).toBe(true);
  });
});
