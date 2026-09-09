import { describe, expect, it } from 'vitest';
import { createGame } from '../game/engine';

function snapshot(game: ReturnType<typeof createGame>) {
  return {
    board: game.board.map((row) => [...row]),
    active: game.active ? { ...game.active } : null,
    score: game.score,
    lines: game.lines,
    hold: game.hold,
    elapsedMs: game.elapsedMs,
  };
}

describe('TETR-43 Pause and resume gameplay', () => {
  it('TETR-43 The falling piece, timers, and gravity stop advancing', () => {
    const game = createGame({ gravityMs: 80, pieceSequence: ['T', 'I'] });
    game.setActive('T', 4, 12, 0);
    const before = snapshot(game);

    game.pause();
    game.update(1_000);
    game.update(500);

    expect(game.isPaused()).toBe(true);
    expect(game.active).toEqual(before.active);
    expect(game.elapsedMs).toBe(before.elapsedMs);
    expect(game.board).toEqual(before.board);
    expect(game.score).toBe(before.score);
  });
});

describe('TETR-44 Pause and resume gameplay', () => {
  it('TETR-44 Gameplay continues from the exact state it was paused at, with no lost or altered board state', () => {
    const game = createGame({ gravityMs: 200, pieceSequence: ['T', 'I'] });
    game.setActive('T', 4, 10, 0);
    game.occupy(0, 0, 'I');
    game.occupy(1, 0, 'J');
    const pausedAt = snapshot(game);

    game.pause();
    game.update(800);
    expect(snapshot(game)).toEqual(pausedAt);

    game.resume();
    expect(game.isPaused()).toBe(false);
    expect(game.board).toEqual(pausedAt.board);
    expect(game.active).toEqual(pausedAt.active);
    expect(game.score).toBe(pausedAt.score);
    expect(game.lines).toBe(pausedAt.lines);
    expect(game.hold).toBe(pausedAt.hold);

    game.update(200);
    expect(game.active?.y).toBeLessThan(pausedAt.active!.y);
    expect(game.elapsedMs).toBeGreaterThan(pausedAt.elapsedMs);
    expect(game.board[0]![0]).toBe('I');
    expect(game.board[0]![1]).toBe('J');
  });
});
