import { describe, expect, it } from 'vitest';
import {
  BUFFER_ROWS,
  createGame,
  DEFAULT_BASE_GRAVITY_MS,
  DEFAULT_MIN_GRAVITY_MS,
  fallSpeedCellsPerSecond,
  gravityMsForLevel,
  LINES_PER_LEVEL,
  VISIBLE_COLS,
  VISIBLE_ROWS,
  type Game,
} from './engine';

function clearBottomLine(game: Game): void {
  for (let x = 0; x < VISIBLE_COLS - 1; x += 1) {
    game.occupy(x, 0, 'J');
  }
  game.setActive('I', VISIBLE_COLS - 3, 8, 1);
  game.hardDrop();
}

describe('TETR-38 Level progression and gravity speed curve', () => {
  it('TETR-38 the level increments by one', () => {
    const game = createGame({
      gravityMs: 1_000_000,
      pieceSequence: ['I', 'I', 'T'],
    });

    game.lines = LINES_PER_LEVEL - 1;
    expect(game.level).toBe(1);

    clearBottomLine(game);

    expect(game.lines).toBeGreaterThanOrEqual(LINES_PER_LEVEL);
    expect(game.level).toBe(2);
  });
});

describe('TETR-39 Level progression and gravity speed curve', () => {
  it('TETR-39 the fall speed increases according to the defined level-to-speed curve', () => {
    const game = createGame({
      gravityMs: DEFAULT_BASE_GRAVITY_MS,
      pieceSequence: ['I', 'I', 'T'],
    });
    const level1Gravity = game.gravityMs;
    const level1Speed = fallSpeedCellsPerSecond(level1Gravity);

    expect(level1Gravity).toBe(gravityMsForLevel(1, { baseGravityMs: DEFAULT_BASE_GRAVITY_MS }));

    game.lines = LINES_PER_LEVEL - 1;
    clearBottomLine(game);

    expect(game.level).toBe(2);
    expect(game.gravityMs).toBe(
      gravityMsForLevel(2, {
        baseGravityMs: DEFAULT_BASE_GRAVITY_MS,
        minGravityMs: DEFAULT_MIN_GRAVITY_MS,
      }),
    );
    expect(game.gravityMs).toBeLessThan(level1Gravity);
    expect(fallSpeedCellsPerSecond(game.gravityMs)).toBeGreaterThan(level1Speed);
    expect(game.gravityMs).toBeLessThan(gravityMsForLevel(1));
  });
});

describe('TETR-40 Level progression and gravity speed curve', () => {
  it('TETR-40 the fall speed is clamped to the cap', () => {
    const speedCapMs = 400;
    const highLevel = 18;
    const unclamped = gravityMsForLevel(highLevel, {
      baseGravityMs: DEFAULT_BASE_GRAVITY_MS,
      minGravityMs: 0,
    });
    expect(unclamped).toBeLessThan(speedCapMs);

    const clamped = gravityMsForLevel(highLevel, {
      baseGravityMs: DEFAULT_BASE_GRAVITY_MS,
      minGravityMs: speedCapMs,
    });
    expect(clamped).toBe(speedCapMs);

    const game = createGame({
      gravityMs: DEFAULT_BASE_GRAVITY_MS,
      minGravityMs: speedCapMs,
      pieceSequence: ['I', 'I', 'T'],
    });
    game.lines = (highLevel - 1) * LINES_PER_LEVEL - 1;
    expect(game.level).toBe(highLevel - 1);

    clearBottomLine(game);

    expect(game.level).toBeGreaterThanOrEqual(highLevel);
    expect(
      gravityMsForLevel(game.level, {
        baseGravityMs: DEFAULT_BASE_GRAVITY_MS,
        minGravityMs: 0,
      }),
    ).toBeLessThan(speedCapMs);
    expect(game.gravityMs).toBe(speedCapMs);
  });
});

describe('TETR-41 Game-over detection: block out and top out', () => {
  it('TETR-41 the game ends with a block-out game over', () => {
    const game = createGame({
      gravityMs: 1_000_000,
      pieceSequence: ['T', 'O', 'I'],
    });

    game.occupy(4, 21, 'I');
    game.occupy(5, 21, 'I');
    game.occupy(4, 22, 'I');
    game.occupy(5, 22, 'I');
    game.setActive('T', 4, 10, 0);
    game.hardDrop();

    expect(game.isOver()).toBe(true);
    expect(game.getGameOverReason()).toBe('block-out');
  });
});

describe('TETR-42 Game-over detection: block out and top out', () => {
  it('TETR-42 the game ends with a top-out game over', () => {
    const game = createGame({
      gravityMs: 1_000_000,
      pieceSequence: ['T', 'O', 'I'],
    });

    expect(BUFFER_ROWS).toBeGreaterThan(0);
    game.occupy(3, VISIBLE_ROWS, 'I');
    game.occupy(4, VISIBLE_ROWS, 'I');
    game.occupy(5, VISIBLE_ROWS, 'I');
    game.setActive('T', 3, VISIBLE_ROWS, 0);
    expect(game.getActiveCells().some((cell) => cell.y >= VISIBLE_ROWS)).toBe(true);

    game.hardDrop();

    expect(game.isOver()).toBe(true);
    expect(game.getGameOverReason()).toBe('top-out');
  });
});
