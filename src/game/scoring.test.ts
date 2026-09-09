import { describe, expect, it } from 'vitest';
import {
  BACK_TO_BACK_MULTIPLIER,
  COMBO_POINTS_PER_LEVEL,
  LINE_CLEAR_SCORES,
  VISIBLE_COLS,
  classifyClear,
  createGame,
  scoreClear,
  type Game,
} from './engine';
import { createGameplayScreen } from '../ui/gameplay';

function fillRowExcept(game: Game, y: number, holes: number[]): void {
  for (let x = 0; x < VISIBLE_COLS; x += 1) {
    if (!holes.includes(x)) game.occupy(x, y, 'J');
  }
}

function lockSingle(game: Game): void {
  fillRowExcept(game, 0, [VISIBLE_COLS - 1]);
  game.setActive('I', VISIBLE_COLS - 3, 8, 1);
  game.hardDrop();
}

function lockDouble(game: Game): void {
  fillRowExcept(game, 0, [VISIBLE_COLS - 1]);
  fillRowExcept(game, 1, [VISIBLE_COLS - 1]);
  game.setActive('I', VISIBLE_COLS - 3, 8, 1);
  game.hardDrop();
}

function lockTriple(game: Game): void {
  fillRowExcept(game, 0, [VISIBLE_COLS - 1]);
  fillRowExcept(game, 1, [VISIBLE_COLS - 1]);
  fillRowExcept(game, 2, [VISIBLE_COLS - 1]);
  game.setActive('I', VISIBLE_COLS - 3, 8, 1);
  game.hardDrop();
}

function lockTetris(game: Game): void {
  for (let y = 0; y < 4; y += 1) {
    fillRowExcept(game, y, [VISIBLE_COLS - 1]);
  }
  game.setActive('I', VISIBLE_COLS - 3, 8, 1);
  game.hardDrop();
}

function lockTSpinSingle(game: Game): void {
  fillRowExcept(game, 0, [4]);
  game.occupy(3, 2, 'J');
  game.setActive('T', 3, 0, 0);
  expect(game.rotateCw().success).toBe(true);
  game.hardDrop();
}

function lockNoClear(game: Game): void {
  game.setActive('O', 0, 8, 0);
  game.hardDrop();
}

function resetPlayfield(game: Game): void {
  for (const row of game.board) {
    row.fill(null);
  }
}

function createScoringGame(): Game {
  return createGame({
    gravityMs: 1_000_000,
    pieceSequence: Array.from({ length: 40 }, () => 'I' as const),
  });
}

describe('TETR-31 Clear-type and level-scaled scoring with drop bonuses', () => {
  it('TETR-31 the amount is determined by clear type (single/double/triple/Tetris/T-Spin) scaled by the current level', () => {
    const level1 = createScoringGame();
    lockSingle(level1);
    expect(level1.lastLock?.linesCleared).toBe(1);
    expect(level1.lastLock?.clearType).toBe('single');
    expect(level1.lastLock?.scoreAwarded).toBe(LINE_CLEAR_SCORES[1] * 1);

    const level2Single = createScoringGame();
    level2Single.lines = 10;
    lockSingle(level2Single);
    expect(level2Single.level).toBe(2);
    expect(level2Single.lastLock?.scoreAwarded).toBe(LINE_CLEAR_SCORES[1] * 2);

    const doubleGame = createScoringGame();
    lockDouble(doubleGame);
    expect(doubleGame.lastLock?.clearType).toBe('double');
    expect(doubleGame.lastLock?.scoreAwarded).toBe(LINE_CLEAR_SCORES[2]);

    const tripleGame = createScoringGame();
    lockTriple(tripleGame);
    expect(tripleGame.lastLock?.clearType).toBe('triple');
    expect(tripleGame.lastLock?.scoreAwarded).toBe(LINE_CLEAR_SCORES[3]);

    const tetrisGame = createScoringGame();
    lockTetris(tetrisGame);
    expect(tetrisGame.lastLock?.isTetris).toBe(true);
    expect(tetrisGame.lastLock?.clearType).toBe('tetris');
    expect(tetrisGame.lastLock?.scoreAwarded).toBe(LINE_CLEAR_SCORES[4]);

    const tSpinGame = createGame({
      gravityMs: 1_000_000,
      pieceSequence: ['T', 'I', 'I', 'I', 'I'],
    });
    lockTSpinSingle(tSpinGame);
    expect(tSpinGame.lastLock?.isTSpin).toBe(true);
    expect(tSpinGame.lastLock?.clearType).toBe('t-spin-single');
    expect(tSpinGame.lastLock?.scoreAwarded).toBe(
      scoreClear({ clearType: 't-spin-single', level: 1, backToBack: false, combo: 0 }).total,
    );

    expect(classifyClear(1, 'none')).toBe('single');
    expect(classifyClear(4, 'none')).toBe('tetris');
    expect(classifyClear(1, 'full')).toBe('t-spin-single');
    expect(scoreClear({ clearType: 'single', level: 5, backToBack: false, combo: 0 }).total).toBe(
      100 * 5,
    );
  });
});

describe('TETR-32 Clear-type and level-scaled scoring with drop bonuses', () => {
  it('TETR-32 a small per-cell score bonus is added', () => {
    const game = createGame({
      gravityMs: 1000,
      softDropMs: 50,
      pieceSequence: ['T'],
    });
    game.setActive('T', 4, 12, 0);
    const startScore = game.score;

    game.pressSoftDrop();
    game.update(50);

    expect(game.score).toBe(startScore + game.softDropPointsPerCell);
    expect(game.softDropPointsPerCell).toBe(1);
    expect(game.lastLock).toBeNull();
  });
});

describe('TETR-33 Clear-type and level-scaled scoring with drop bonuses', () => {
  it('TETR-33 a larger per-cell score bonus is added based on the distance dropped', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['T', 'I'] });
    game.setActive('T', 4, 12, 0);
    const distance = game.active!.y - game.getGhostY()!;
    const startScore = game.score;

    game.hardDrop();

    expect(distance).toBeGreaterThan(0);
    expect(game.score).toBe(startScore + distance * game.hardDropPointsPerCell);
    expect(game.hardDropPointsPerCell).toBeGreaterThan(game.softDropPointsPerCell);
    expect(game.lastLock?.linesCleared).toBe(0);
  });
});

describe('TETR-34 Back-to-back bonus for consecutive difficult clears', () => {
  it('TETR-34 a back-to-back bonus is added to the score', () => {
    const game = createScoringGame();
    lockTetris(game);
    expect(game.lastLock?.clearType).toBe('tetris');
    expect(game.lastLock?.backToBackAwarded).toBe(false);
    expect(game.backToBackActive).toBe(true);
    const firstAward = game.lastLock!.scoreAwarded;

    lockNoClear(game);
    expect(game.combo).toBe(0);
    expect(game.backToBackActive).toBe(true);

    lockTetris(game);
    expect(game.lastLock?.clearType).toBe('tetris');
    expect(game.lastLock?.backToBackAwarded).toBe(true);
    const expected = scoreClear({
      clearType: 'tetris',
      level: game.level,
      backToBack: true,
      combo: game.lastLock!.combo,
    });
    expect(game.lastLock?.scoreAwarded).toBe(expected.total);
    expect(game.lastLock!.scoreAwarded).toBeGreaterThan(firstAward);
    expect(expected.backToBackBonus).toBeGreaterThan(0);
    expect(BACK_TO_BACK_MULTIPLIER).toBe(1.5);

    const tSpinGame = createGame({
      gravityMs: 1_000_000,
      pieceSequence: ['T', 'I', 'T', 'I', 'T', 'I', 'I', 'I'],
    });
    lockTSpinSingle(tSpinGame);
    expect(tSpinGame.lastLock?.isTSpin).toBe(true);
    expect(tSpinGame.backToBackActive).toBe(true);
    resetPlayfield(tSpinGame);
    lockNoClear(tSpinGame);
    resetPlayfield(tSpinGame);
    lockTSpinSingle(tSpinGame);
    expect(tSpinGame.lastLock?.isTSpin).toBe(true);
    expect(tSpinGame.lastLock?.backToBackAwarded).toBe(true);
    expect(tSpinGame.lastLock!.scoreAwarded).toBeGreaterThan(
      scoreClear({ clearType: 't-spin-single', level: 1, backToBack: false, combo: 0 }).total,
    );
  });
});

describe('TETR-35 Back-to-back bonus for consecutive difficult clears', () => {
  it('TETR-35 the back-to-back streak resets and no bonus is applied to that clear', () => {
    const game = createScoringGame();
    lockTetris(game);
    expect(game.backToBackActive).toBe(true);

    lockSingle(game);
    expect(game.lastLock?.clearType).toBe('single');
    expect(game.lastLock?.backToBackAwarded).toBe(false);
    expect(game.backToBackActive).toBe(false);
    expect(game.lastLock?.scoreAwarded).toBe(
      scoreClear({
        clearType: 'single',
        level: 1,
        backToBack: false,
        combo: game.lastLock!.combo,
      }).total,
    );

    lockTetris(game);
    expect(game.lastLock?.backToBackAwarded).toBe(false);
  });
});

describe('TETR-36 Combo counter for consecutive clears', () => {
  it('TETR-36 the combo counter increments and a combo score bonus is applied', () => {
    const game = createScoringGame();
    lockSingle(game);
    expect(game.combo).toBe(0);
    expect(game.lastLock?.combo).toBe(0);

    lockSingle(game);
    expect(game.combo).toBe(1);
    expect(game.lastLock?.combo).toBe(1);
    const awarded = scoreClear({
      clearType: 'single',
      level: 1,
      backToBack: false,
      combo: 1,
    });
    expect(awarded.comboScore).toBe(COMBO_POINTS_PER_LEVEL * 1 * 1);
    expect(game.lastLock?.scoreAwarded).toBe(awarded.total);

    lockSingle(game);
    expect(game.combo).toBe(2);
    expect(game.lastLock?.scoreAwarded).toBe(
      scoreClear({ clearType: 'single', level: 1, backToBack: false, combo: 2 }).total,
    );

    const hud = createGameplayScreen({ game }).render();
    expect(hud.hud.combo).toBe(2);
    expect(hud.html).toContain('data-testid="hud-combo"');
  });
});

describe('TETR-37 Combo counter for consecutive clears', () => {
  it('TETR-37 the combo counter resets to zero', () => {
    const game = createScoringGame();
    lockSingle(game);
    lockSingle(game);
    expect(game.combo).toBe(1);

    lockNoClear(game);
    expect(game.combo).toBe(0);
    expect(game.lastLock?.linesCleared).toBe(0);

    lockSingle(game);
    expect(game.combo).toBe(0);
    expect(game.lastLock?.scoreAwarded).toBe(
      scoreClear({ clearType: 'single', level: 1, backToBack: false, combo: 0 }).total,
    );
  });
});
