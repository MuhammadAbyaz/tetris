import { describe, expect, it } from 'vitest';
import { createGame, VISIBLE_COLS, type Game } from '../game/engine';
import { createMemoryStore } from './persistence';
import {
  getLocalRecords,
  getLocalRecordsByMode,
  LOCAL_LEADERBOARD_LIMIT,
  renderLocalLeaderboard,
  submitLocalRecord,
} from './local-leaderboard';

function finishGame(mode: 'marathon' | 'sprint' | 'ultra', score: number): Game {
  const game = createGame({
    gravityMs: 1_000_000,
    mode,
    pieceSequence: ['T', 'I'],
  });
  game.setActive('T', 4, 4, 0);
  for (let y = 18; y < 24; y += 1) {
    for (let x = 0; x < VISIBLE_COLS; x += 1) {
      if (x !== 9) game.occupy(x, y, 'I');
    }
  }
  game.hardDrop();
  (game as unknown as { score: number }).score = score;
  return game;
}

describe('TETR-62 Local leaderboard with per-mode records', () => {
  it("TETR-62 It is added to that mode's local leaderboard", () => {
    const store = createMemoryStore();
    const marathon = finishGame('marathon', 12_400);
    expect(marathon.isOver()).toBe(true);

    const added = submitLocalRecord(store, {
      mode: marathon.mode,
      score: marathon.score,
      lines: marathon.lines,
      level: marathon.level,
      elapsedMs: marathon.elapsedMs,
    });

    expect(added).not.toBeNull();
    expect(added?.mode).toBe('marathon');
    expect(added?.score).toBe(12_400);
    const board = getLocalRecords(store, 'marathon');
    expect(board).toHaveLength(1);
    expect(board[0]?.score).toBe(12_400);

    for (let i = 0; i < LOCAL_LEADERBOARD_LIMIT; i += 1) {
      submitLocalRecord(store, {
        mode: 'marathon',
        score: 50_000 + i,
        lines: 10,
        level: 2,
        elapsedMs: 1000,
        at: i + 1,
      });
    }
    const rejected = submitLocalRecord(store, {
      mode: 'marathon',
      score: 1,
      lines: 0,
      level: 1,
      elapsedMs: 100,
      at: 99,
    });
    expect(rejected).toBeNull();
    expect(getLocalRecords(store, 'marathon')).toHaveLength(LOCAL_LEADERBOARD_LIMIT);
    expect(getLocalRecords(store, 'sprint')).toEqual([]);
  });
});

describe('TETR-63 Local leaderboard with per-mode records', () => {
  it('TETR-63 Records are shown grouped or filterable by game mode', () => {
    const store = createMemoryStore();
    submitLocalRecord(store, {
      mode: 'marathon',
      score: 2000,
      lines: 8,
      level: 2,
      elapsedMs: 4000,
      at: 1,
    });
    submitLocalRecord(store, {
      mode: 'sprint',
      score: 800,
      lines: 40,
      level: 5,
      elapsedMs: 75000,
      at: 2,
    });
    submitLocalRecord(store, {
      mode: 'ultra',
      score: 3300,
      lines: 20,
      level: 3,
      elapsedMs: 180000,
      at: 3,
    });

    const grouped = getLocalRecordsByMode(store);
    expect(grouped.marathon?.map((row) => row.score)).toEqual([2000]);
    expect(grouped.sprint?.map((row) => row.score)).toEqual([800]);
    expect(grouped.ultra?.map((row) => row.score)).toEqual([3300]);

    const allHtml = renderLocalLeaderboard(store, 'all');
    expect(allHtml).toContain('data-testid="local-leaderboard"');
    expect(allHtml).toContain('data-testid="leaderboard-mode-filter"');
    expect(allHtml).toContain('data-testid="leaderboard-groups"');
    expect(allHtml).toContain('data-grouped="true"');
    expect(allHtml).toContain('data-testid="leaderboard-group-marathon"');
    expect(allHtml).toContain('data-testid="leaderboard-group-sprint"');
    expect(allHtml).toContain('data-testid="leaderboard-group-ultra"');

    const sprintHtml = renderLocalLeaderboard(store, 'sprint');
    expect(sprintHtml).toContain('data-filter="sprint"');
    expect(sprintHtml).toContain('data-testid="leaderboard-group-sprint"');
    expect(sprintHtml).not.toContain('data-testid="leaderboard-group-marathon"');
    expect(sprintHtml).toContain('selected');
  });
});
