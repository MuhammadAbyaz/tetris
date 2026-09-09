import type { GameBackend, LeaderboardEntry } from './backend';

export function submitScore(
  backend: GameBackend,
  input: { playerId: string; displayName: string; mode: string; score: number },
): LeaderboardEntry {
  return backend.submitScore(input);
}

export function getGlobalLeaderboard(backend: GameBackend, mode: string): LeaderboardEntry[] {
  return backend.getLeaderboard(mode);
}
