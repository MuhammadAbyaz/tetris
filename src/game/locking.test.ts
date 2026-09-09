import { describe, expect, it } from 'vitest';
import {
  LINE_CLEAR_ANIMATION_MS,
  LOCK_DELAY_MS,
  LOCK_RESET_LIMIT,
  T_SPIN_SCORES,
  VISIBLE_COLS,
  classifyClear,
  createGame,
  scoreClear,
  type Game,
} from './engine';

function fillRowExcept(game: Game, y: number, holes: number[]): void {
  for (let x = 0; x < VISIBLE_COLS; x += 1) {
    if (!holes.includes(x)) game.occupy(x, y, 'J');
  }
}

function landOnFloor(game: Game): void {
  const y = game.getGhostY();
  if (y === null || !game.active) return;
  game.setActive(game.active.type, game.active.x, y, game.active.rotation);
}

describe('TETR-22 Lock delay and hard-drop instant lock', () => {
  it('TETR-22 the piece locks after approximately 0.5 seconds', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['T', 'I'] });
    landOnFloor(game);

    expect(game.isGrounded()).toBe(true);
    expect(LOCK_DELAY_MS).toBe(500);

    game.update(LOCK_DELAY_MS - 1);
    expect(game.active?.type).toBe('T');
    expect(game.boardHasType('T')).toBe(false);

    game.update(1);
    expect(game.boardHasType('T')).toBe(true);
    expect(game.active?.type).toBe('I');
  });
});

describe('TETR-23 Lock delay and hard-drop instant lock', () => {
  it('TETR-23 the lock timer resets, up to the defined move-reset cap', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['T', 'I'] });
    landOnFloor(game);
    expect(game.lockResetLimit).toBe(LOCK_RESET_LIMIT);

    game.update(200);
    expect(game.tryMove(1, 0)).toBe(true);
    game.update(200);
    expect(game.active?.type).toBe('T');
    expect(game.boardHasType('T')).toBe(false);

    game.update(LOCK_DELAY_MS - 200);
    expect(game.boardHasType('T')).toBe(true);
    expect(game.active?.type).toBe('I');

    const capped = createGame({ gravityMs: 1_000_000, pieceSequence: ['T', 'I'] });
    landOnFloor(capped);
    let dir: -1 | 1 = 1;
    for (let i = 0; i < LOCK_RESET_LIMIT; i += 1) {
      expect(capped.tryMove(dir, 0)).toBe(true);
      dir = dir === 1 ? -1 : 1;
    }
    capped.update(200);
    expect(capped.tryMove(dir, 0)).toBe(true);
    capped.update(LOCK_DELAY_MS - 200 - 1);
    expect(capped.active?.type).toBe('T');
    capped.update(1);
    expect(capped.boardHasType('T')).toBe(true);
    expect(capped.active?.type).toBe('I');
  });
});

describe('TETR-24 Lock delay and hard-drop instant lock', () => {
  it('TETR-24 the piece locks immediately without waiting for the lock delay', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['T', 'I'] });
    game.setActive('T', 4, 12, 0);
    expect(game.isGrounded()).toBe(false);

    game.hardDrop();

    expect(game.boardHasType('T')).toBe(true);
    expect(game.active?.type).toBe('I');
    expect(game.elapsedMs).toBe(0);
  });
});

describe('TETR-25 Line clear detection, multi-line clears, and clear animation', () => {
  it('TETR-25 those rows are detected as cleared', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['I', 'T'] });
    fillRowExcept(game, 0, [VISIBLE_COLS - 1]);
    fillRowExcept(game, 2, [VISIBLE_COLS - 1]);
    game.setActive('I', VISIBLE_COLS - 3, 8, 1);
    game.hardDrop();

    expect(game.lastLock?.linesCleared).toBe(2);
    expect(game.getClearingRows()).toEqual([0, 2]);
    expect(game.isClearing()).toBe(true);
    expect(game.board[0]!.every((cell) => cell !== null)).toBe(true);
    expect(game.board[2]!.every((cell) => cell !== null)).toBe(true);
  });
});

describe('TETR-26 Line clear detection, multi-line clears, and clear animation', () => {
  it('TETR-26 it is classified respectively as single, double, triple, or Tetris', () => {
    expect(classifyClear(1, 'none')).toBe('single');
    expect(classifyClear(2, 'none')).toBe('double');
    expect(classifyClear(3, 'none')).toBe('triple');
    expect(classifyClear(4, 'none')).toBe('tetris');

    const kinds: Array<{ rows: number; type: 'single' | 'double' | 'triple' | 'tetris' }> = [
      { rows: 1, type: 'single' },
      { rows: 2, type: 'double' },
      { rows: 3, type: 'triple' },
      { rows: 4, type: 'tetris' },
    ];
    for (const { rows, type } of kinds) {
      const game = createGame({
        gravityMs: 1_000_000,
        pieceSequence: Array.from({ length: 8 }, () => 'I' as const),
      });
      for (let y = 0; y < rows; y += 1) {
        fillRowExcept(game, y, [VISIBLE_COLS - 1]);
      }
      game.setActive('I', VISIBLE_COLS - 3, 8, 1);
      game.hardDrop();
      expect(game.lastLock?.linesCleared).toBe(rows);
      expect(game.lastLock?.clearType).toBe(type);
      expect(game.lastLock?.isTetris).toBe(rows === 4);
    }
  });
});

describe('TETR-27 Line clear detection, multi-line clears, and clear animation', () => {
  it('TETR-27 rows above the cleared rows collapse downward only after the animation completes', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['I', 'T'] });
    fillRowExcept(game, 0, [VISIBLE_COLS - 1]);
    game.occupy(0, 1, 'Z');
    game.setActive('I', VISIBLE_COLS - 3, 8, 1);
    game.hardDrop();

    expect(game.isClearing()).toBe(true);
    expect(game.board[1]![0]).toBe('Z');
    expect(LINE_CLEAR_ANIMATION_MS).toBeGreaterThan(0);

    game.update(LINE_CLEAR_ANIMATION_MS - 1);
    expect(game.isClearing()).toBe(true);
    expect(game.board[1]![0]).toBe('Z');
    expect(game.board[0]![0]).not.toBe('Z');

    game.update(1);
    expect(game.isClearing()).toBe(false);
    expect(game.getClearingRows()).toEqual([]);
    expect(game.board[0]![0]).toBe('Z');
    expect(game.board[1]![0]).not.toBe('Z');
  });
});

describe('TETR-28 T-Spin detection for bonus scoring', () => {
  it('TETR-28 the clear (or non-clear lock) is flagged as a T-Spin', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['T', 'I'] });
    fillRowExcept(game, 0, [4]);
    game.occupy(3, 2, 'J');
    game.setActive('T', 3, 0, 0);
    expect(game.rotateCw().success).toBe(true);
    game.hardDrop();

    expect(game.lastLock?.isTSpin).toBe(true);
    expect(game.lastLock?.isMiniTSpin).toBe(false);
    expect(game.lastLock?.clearType.startsWith('t-spin')).toBe(true);
  });
});

describe('TETR-29 T-Spin detection for bonus scoring', () => {
  it('TETR-29 the event is flagged as a Mini T-Spin', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['T', 'I'] });
    game.occupy(2, 2, 'J');
    game.occupy(4, 2, 'J');
    game.setActive('T', 3, -1, 0);
    const rotated = game.rotateCw();
    expect(rotated.success).toBe(true);
    expect(rotated.kick).not.toEqual([0, 0]);
    game.hardDrop();

    expect(game.lastLock?.isMiniTSpin).toBe(true);
    expect(game.lastLock?.isTSpin).toBe(true);
    expect(game.lastLock?.clearType.startsWith('mini-t-spin')).toBe(true);
  });
});

describe('TETR-30 T-Spin detection for bonus scoring', () => {
  it('TETR-30 the T-Spin bonus scoring is used instead of the standard clear-type score', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['T', 'I'] });
    fillRowExcept(game, 0, [4]);
    game.occupy(3, 2, 'J');
    game.setActive('T', 3, 0, 0);
    expect(game.rotateCw().success).toBe(true);
    game.hardDrop();

    const tSpinScore = scoreClear({
      clearType: 't-spin-single',
      level: 1,
      backToBack: false,
      combo: 0,
    }).total;
    const standardSingle = scoreClear({
      clearType: 'single',
      level: 1,
      backToBack: false,
      combo: 0,
    }).total;

    expect(game.lastLock?.linesCleared).toBe(1);
    expect(game.lastLock?.clearType).toBe('t-spin-single');
    expect(game.lastLock?.scoreAwarded).toBe(tSpinScore);
    expect(game.lastLock?.scoreAwarded).toBe(T_SPIN_SCORES[1]);
    expect(game.lastLock?.scoreAwarded).not.toBe(standardSingle);
    expect(tSpinScore).toBeGreaterThan(standardSingle);
  });
});
