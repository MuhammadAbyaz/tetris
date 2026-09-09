import { playReplay, type ReplayLog } from '../player/replay';

export class ScoreRejectedError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(`Score rejected: ${reason}`);
    this.name = 'ScoreRejectedError';
    this.reason = reason;
  }
}

export function simulateReplayOutcome(log: ReplayLog): {
  score: number;
  lines: number;
  level: number;
} {
  const playback = playReplay(log);
  const endMs = log.elapsedMs ?? log.events.reduce((max, event) => Math.max(max, event.t), 0);
  let guard = 0;
  while (playback.game.elapsedMs < endMs && !playback.game.isOver() && guard < 100_000) {
    playback.advance(Math.min(16, Math.max(0, endMs - playback.game.elapsedMs)));
    guard += 1;
  }
  playback.advance(0);
  return {
    score: playback.game.score,
    lines: playback.game.lines,
    level: playback.game.level,
  };
}

export function validateLeaderboardSubmission(input: {
  score: number;
  replay?: ReplayLog;
}): { ok: true; score: number } | { ok: false; reason: string } {
  if (!Number.isFinite(input.score) || input.score < 0) {
    return { ok: false, reason: 'invalid-score' };
  }
  const score = Math.floor(input.score);
  if (!input.replay) {
    return { ok: false, reason: 'missing-replay' };
  }
  const simulated = simulateReplayOutcome(input.replay);
  if (simulated.score !== score) {
    return { ok: false, reason: 'replay-mismatch' };
  }
  if (input.replay.outcome.score !== score) {
    return { ok: false, reason: 'outcome-mismatch' };
  }
  return { ok: true, score };
}
