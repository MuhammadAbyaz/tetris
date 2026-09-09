import { describe, expect, it } from 'vitest';
import { createGame } from '../game/engine';
import { dispatchAction } from '../player/controls';
import { createReplayRecorder, type ReplayLog } from '../player/replay';
import { createBackend } from './backend';
import { getGlobalLeaderboard, submitScore } from './leaderboard';
import { ScoreRejectedError, validateLeaderboardSubmission } from './score-validation';

function recordedGame(): { log: ReplayLog; score: number } {
  const game = createGame({
    gravityMs: 1_000_000,
    dasMs: 1_000,
    arrMs: 1_000,
    pieceSequence: ['T', 'I', 'O', 'J'],
  });
  const recorder = createReplayRecorder(game);
  recorder.record('action', 'hardDrop');
  dispatchAction(game, 'hardDrop');
  return { log: recorder.finalize(), score: game.score };
}

describe('TETR-88 Server-side score validation for online features', () => {
  it('TETR-88 It validates the score against server-side game-state or replay checks before accepting it', () => {
    const { log, score } = recordedGame();
    const check = validateLeaderboardSubmission({ score, replay: log });
    expect(check.ok).toBe(true);
    if (check.ok) expect(check.score).toBe(score);

    const backend = createBackend();
    const submitted = submitScore(backend, {
      playerId: 'player-1',
      displayName: 'Ada',
      mode: 'marathon',
      score,
      replay: log,
    });
    expect(submitted.score).toBe(score);
    expect(getGlobalLeaderboard(backend, 'marathon')).toHaveLength(1);
    expect(getGlobalLeaderboard(backend, 'marathon')[0]?.id).toBe(submitted.id);
  });
});

describe('TETR-89 Server-side score validation for online features', () => {
  it('TETR-89 The score is rejected and not persisted to the global leaderboard', () => {
    const { log, score } = recordedGame();
    const backend = createBackend();
    submitScore(backend, {
      playerId: 'honest',
      displayName: 'Honest',
      mode: 'marathon',
      score,
      replay: log,
    });

    const forged = validateLeaderboardSubmission({ score: score + 50_000, replay: log });
    expect(forged.ok).toBe(false);

    expect(() =>
      submitScore(backend, {
        playerId: 'cheater',
        displayName: 'Cheater',
        mode: 'marathon',
        score: score + 50_000,
        replay: log,
      }),
    ).toThrow(ScoreRejectedError);

    expect(() =>
      submitScore(backend, {
        playerId: 'cheater',
        displayName: 'Cheater',
        mode: 'marathon',
        score: 999_999,
      }),
    ).toThrow(ScoreRejectedError);

    const board = getGlobalLeaderboard(backend, 'marathon');
    expect(board).toHaveLength(1);
    expect(board[0]?.playerId).toBe('honest');
    expect(board.some((row) => row.score === score + 50_000 || row.score === 999_999)).toBe(false);
  });
});
