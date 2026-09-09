import type { ReplayLog } from '../player/replay';
import type { GameBackend, LeaderboardEntry } from './backend';

export function submitScore(
  backend: GameBackend,
  input: {
    playerId: string;
    displayName: string;
    mode: string;
    score: number;
    replay?: ReplayLog;
  },
): LeaderboardEntry {
  return backend.submitScore(input);
}

export function getGlobalLeaderboard(backend: GameBackend, mode: string): LeaderboardEntry[] {
  return backend.getLeaderboard(mode);
}
