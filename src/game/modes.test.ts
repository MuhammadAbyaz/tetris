import { describe, expect, it } from 'vitest';
import {
  createGame,
  LINES_PER_LEVEL,
  SPRINT_LINE_TARGET,
  ULTRA_TIME_LIMIT_MS,
  VISIBLE_COLS,
  VISIBLE_ROWS,
  type Game,
} from './engine';
import { createModeGame } from './modes';
import { createGameplayScreen, formatElapsed } from '../ui/gameplay';
import {
  countGarbageRows,
  createVersusSession,
  garbageLinesForAttack,
  garbageLinesForClears,
} from '../social/versus';

function manyI(count: number): Array<'I'> {
  return Array.from({ length: count }, () => 'I');
}

function clearBottomLine(game: Game): void {
  for (let x = 0; x < VISIBLE_COLS - 1; x += 1) {
    game.occupy(x, 0, 'J');
  }
  game.setActive('I', VISIBLE_COLS - 3, 8, 1);
  game.hardDrop();
}

function clearLines(game: Game, count: number, holeX = 9): void {
  for (let y = 0; y < count; y += 1) {
    for (let x = 0; x < VISIBLE_COLS; x += 1) {
      if (x !== holeX) game.occupy(x, y, 'J');
    }
  }
  game.setActive('I', holeX - 2, 8, 1);
  game.hardDrop();
}

function forceBlockOut(game: Game): void {
  game.occupy(4, 21, 'I');
  game.occupy(5, 21, 'I');
  game.occupy(4, 22, 'I');
  game.occupy(5, 22, 'I');
  game.setActive('T', 4, 10, 0);
  game.hardDrop();
}

function forceTopOut(game: Game): void {
  game.occupy(3, VISIBLE_ROWS, 'I');
  game.occupy(4, VISIBLE_ROWS, 'I');
  game.occupy(5, VISIBLE_ROWS, 'I');
  game.setActive('T', 3, VISIBLE_ROWS, 0);
  game.hardDrop();
}

describe('TETR-90 Marathon mode: There is no fixed end condition other than the standard game-over conditions, and speed increases with level as play continues', () => {
  it('TETR-90 There is no fixed end condition other than the standard game-over conditions, and speed increases with level as play continues', () => {
    const game = createModeGame('marathon', {
      gravityMs: 800,
      pieceSequence: [...manyI(8), 'T'],
    });
    const startGravity = game.gravityMs;

    expect(game.mode).toBe('marathon');
    expect(game.lineTarget).toBeNull();
    expect(game.timeLimitMs).toBeNull();
    expect(game.noFail).toBe(false);

    game.lines = LINES_PER_LEVEL - 1;
    clearBottomLine(game);

    expect(game.level).toBe(2);
    expect(game.gravityMs).toBeLessThan(startGravity);
    expect(game.isOver()).toBe(false);

    const endurance = createModeGame('marathon', {
      gravityMs: 1_000_000,
      pieceSequence: ['T', 'I'],
    });
    endurance.update(ULTRA_TIME_LIMIT_MS + 5_000);
    expect(endurance.isOver()).toBe(false);
    expect(endurance.lineTarget).toBeNull();
    expect(endurance.timeLimitMs).toBeNull();

    forceTopOut(endurance);
    expect(endurance.isOver()).toBe(true);
    expect(endurance.getGameOverReason()).toBe('top-out');
  });
});

describe('TETR-91 Sprint (40 Lines) mode: The mode ends and the elapsed completion time is displayed', () => {
  it('TETR-91 The mode ends and the elapsed completion time is displayed', () => {
    const game = createModeGame('sprint', {
      gravityMs: 1_000_000,
      pieceSequence: [...manyI(8), 'T'],
    });
    expect(game.mode).toBe('sprint');
    expect(game.lineTarget).toBe(SPRINT_LINE_TARGET);

    game.update(12_345);
    game.lines = SPRINT_LINE_TARGET - 1;
    clearBottomLine(game);

    expect(game.lines).toBeGreaterThanOrEqual(SPRINT_LINE_TARGET);
    expect(game.isOver()).toBe(true);
    expect(game.getGameOverReason()).toBe('sprint-complete');

    const screen = createGameplayScreen({ game, title: 'Sprint', testId: 'sprint' });
    const rendered = screen.render();
    expect(rendered.phase).toBe('game-over');
    expect(rendered.html).toContain('Sprint complete');
    expect(rendered.html).toContain('data-testid="completion-time"');
    expect(rendered.html).toContain(formatElapsed(game.elapsedMs));
    expect(rendered.gameOver?.elapsedMs).toBe(game.elapsedMs);
  });
});

describe('TETR-92 Sprint (40 Lines) mode: A running timer is visible to the player', () => {
  it('TETR-92 A running timer is visible to the player', () => {
    const game = createModeGame('sprint', { gravityMs: 1_000_000, pieceSequence: ['T', 'I'] });
    game.update(2_500);
    expect(game.isOver()).toBe(false);

    const screen = createGameplayScreen({ game, title: 'Sprint', testId: 'sprint' });
    const rendered = screen.render();

    expect(rendered.hud.timerVisible).toBe(true);
    expect(rendered.hud.timerKind).toBe('elapsed');
    expect(rendered.hud.timerMs).toBe(game.elapsedMs);
    expect(rendered.html).toContain('data-testid="hud-timer"');
    expect(rendered.html).toMatch(/data-testid="hud-timer"[^>]*data-timer-kind="elapsed"/);
    expect(rendered.html).toContain(formatElapsed(2_500));
    expect(rendered.phase).toBe('playing');
  });
});

describe('TETR-93 Ultra (Time Attack) mode: Play stops automatically and the final score is displayed', () => {
  it('TETR-93 Play stops automatically and the final score is displayed', () => {
    const timeLimitMs = 8_000;
    const game = createModeGame('ultra', {
      gravityMs: 1_000_000,
      timeLimitMs,
      pieceSequence: ['T', 'I', 'O'],
    });
    game.setActive('T', 4, 12, 0);
    game.hardDrop();
    const scoreAtStop = game.score;

    game.update(timeLimitMs);
    expect(game.isOver()).toBe(true);
    expect(game.getGameOverReason()).toBe('time-up');
    expect(game.elapsedMs).toBe(timeLimitMs);
    expect(game.score).toBe(scoreAtStop);

    const screen = createGameplayScreen({ game, title: 'Ultra', testId: 'ultra' });
    const rendered = screen.render();
    expect(rendered.phase).toBe('game-over');
    expect(rendered.html).toContain("Time's up");
    expect(rendered.html).toContain('data-testid="final-score"');
    expect(rendered.html).toContain(String(game.score));
    expect(rendered.gameOver?.score).toBe(game.score);
  });
});

describe('TETR-94 Ultra (Time Attack) mode: A countdown timer showing remaining time is visible to the player', () => {
  it('TETR-94 A countdown timer showing remaining time is visible to the player', () => {
    const timeLimitMs = ULTRA_TIME_LIMIT_MS;
    const game = createModeGame('ultra', { gravityMs: 1_000_000, pieceSequence: ['T'] });
    game.update(15_000);
    expect(game.isOver()).toBe(false);
    expect(game.remainingTimeMs).toBe(timeLimitMs - 15_000);

    const screen = createGameplayScreen({ game, title: 'Ultra', testId: 'ultra' });
    const rendered = screen.render();
    expect(rendered.hud.timerVisible).toBe(true);
    expect(rendered.hud.timerKind).toBe('countdown');
    expect(rendered.hud.timerMs).toBe(game.remainingTimeMs);
    expect(rendered.html).toContain('data-testid="hud-timer"');
    expect(rendered.html).toMatch(/data-testid="hud-timer"[^>]*data-timer-kind="countdown"/);
    expect(rendered.html).toContain(formatElapsed(game.remainingTimeMs));
  });
});

describe('TETR-95 Zen / Practice mode: Play continues instead of ending', () => {
  it('TETR-95 Play continues instead of ending', () => {
    const blocked = createModeGame('zen', {
      gravityMs: 1_000_000,
      pieceSequence: ['T', 'O', 'I', 'L'],
    });
    expect(blocked.mode).toBe('zen');
    expect(blocked.noFail).toBe(true);

    forceBlockOut(blocked);
    expect(blocked.isOver()).toBe(false);
    expect(blocked.getGameOverReason()).toBeNull();
    blocked.update(120);
    expect(blocked.isOver()).toBe(false);
    expect(blocked.active).not.toBeNull();

    const topped = createModeGame('zen', {
      gravityMs: 1_000_000,
      pieceSequence: ['T', 'O', 'I', 'L'],
    });
    forceTopOut(topped);
    expect(topped.isOver()).toBe(false);
    topped.update(80);
    expect(topped.isOver()).toBe(false);
    expect(topped.elapsedMs).toBeGreaterThan(0);
  });
});

describe('TETR-96 Multiplayer Versus mode with garbage lines: Garbage lines are added to the opponent(s) board(s) proportional to the clear', () => {
  it('TETR-96 Garbage lines are added to the opponent(s) board(s) proportional to the clear', () => {
    expect(garbageLinesForAttack(2, 0)).toBe(1);
    expect(garbageLinesForAttack(4, 0)).toBe(4);
    expect(garbageLinesForAttack(1, 2)).toBe(2);

    const duel = createVersusSession('local', {
      holeColumn: 4,
      player1: { gravityMs: 1_000_000, pieceSequence: [...manyI(6)] },
      player2: { gravityMs: 1_000_000, pieceSequence: [...manyI(6)] },
    });
    clearLines(duel.player1, 2);
    expect(duel.player1.lastLock?.linesCleared).toBe(2);
    expect(countGarbageRows(duel.player2)).toBe(garbageLinesForClears(2));
    expect(duel.sentGarbage[0]).toBe(1);

    const comboMatch = createVersusSession('local', {
      holeColumn: 4,
      player1: { gravityMs: 1_000_000, pieceSequence: [...manyI(8)] },
      player2: { gravityMs: 1_000_000, pieceSequence: [...manyI(8)] },
    });
    clearLines(comboMatch.player1, 1);
    expect(countGarbageRows(comboMatch.player2)).toBe(0);
    clearLines(comboMatch.player1, 1);
    expect(comboMatch.player1.lastLock?.combo).toBeGreaterThanOrEqual(1);
    expect(countGarbageRows(comboMatch.player2)).toBe(
      garbageLinesForAttack(1, comboMatch.player1.lastLock!.combo),
    );

    const battle = createVersusSession('local', {
      playerCount: 3,
      holeColumn: 4,
      playerOptions: [
        { gravityMs: 1_000_000, pieceSequence: [...manyI(8)] },
        { gravityMs: 1_000_000, pieceSequence: [...manyI(8)] },
        { gravityMs: 1_000_000, pieceSequence: [...manyI(8)] },
      ],
    });
    clearLines(battle.player(0), 4);
    expect(battle.player(0).lastLock?.isTetris).toBe(true);
    expect(countGarbageRows(battle.player(1))).toBe(garbageLinesForClears(4));
    expect(countGarbageRows(battle.player(2))).toBe(garbageLinesForClears(4));
    expect(countGarbageRows(battle.player(0))).toBe(0);
  });
});

describe('TETR-97 Multiplayer Versus mode with garbage lines: That player is eliminated and remaining players continue until one winner remains', () => {
  it('TETR-97 That player is eliminated and remaining players continue until one winner remains (1v1) or the battle-royale ends', () => {
    const battle = createVersusSession('local', {
      playerCount: 3,
      holeColumn: 4,
      playerOptions: [
        { gravityMs: 1_000_000, pieceSequence: ['T', 'O', 'I', 'L'] },
        { gravityMs: 1_000_000, pieceSequence: ['T', 'O', 'I', 'L'] },
        { gravityMs: 1_000_000, pieceSequence: ['T', 'O', 'I', 'L'] },
      ],
    });

    forceTopOut(battle.player(0));
    expect(battle.player(0).isOver()).toBe(true);
    expect(battle.player(0).getGameOverReason()).toBe('top-out');
    expect(battle.isEliminated(0)).toBe(true);
    expect(battle.winnerIndex).toBeNull();
    expect(battle.aliveCount).toBe(2);

    const before = battle.player(1).elapsedMs;
    battle.update(40);
    expect(battle.player(1).isOver()).toBe(false);
    expect(battle.player(2).isOver()).toBe(false);
    expect(battle.player(1).elapsedMs).toBeGreaterThan(before);

    forceTopOut(battle.player(1));
    expect(battle.isEliminated(1)).toBe(true);
    expect(battle.winnerIndex).toBe(2);
    expect(battle.isFinished).toBe(true);
    expect(battle.player(2).isOver()).toBe(false);
    expect(battle.player(2).isPaused()).toBe(true);

    const duel = createVersusSession('local', {
      holeColumn: 4,
      player1: { gravityMs: 1_000_000, pieceSequence: ['T', 'O', 'I'] },
      player2: { gravityMs: 1_000_000, pieceSequence: ['T', 'O', 'I'] },
    });
    forceTopOut(duel.player1);
    expect(duel.isEliminated(0)).toBe(true);
    expect(duel.winnerIndex).toBe(1);
    expect(duel.isFinished).toBe(true);
  });
});

describe('createGame default remains marathon-compatible', () => {
  it('keeps classic createGame() as a no-fixed-end marathon board', () => {
    const game = createGame({ gravityMs: 1_000_000 });
    expect(game.mode).toBe('marathon');
    expect(game.lineTarget).toBeNull();
  });
});
