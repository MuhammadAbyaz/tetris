import { describe, expect, it } from 'vitest';
import { createMemoryStore, loadPlayerState } from '../player/persistence';
import { getLocalRecords } from '../player/local-leaderboard';
import { isOfflinePlayable, OFFLINE_PLAYABLE_MODES, playOfflineSession } from './offline';

describe('TETR-87 Offline playability for single-player modes', () => {
  it('TETR-87 The mode is fully playable including scoring and local persistence', () => {
    expect(OFFLINE_PLAYABLE_MODES).toEqual(['marathon', 'sprint', 'ultra', 'zen']);
    const network = { online: false };

    for (const mode of OFFLINE_PLAYABLE_MODES) {
      expect(isOfflinePlayable(mode, network)).toBe(true);
      const store = createMemoryStore();
      const session = playOfflineSession({ mode, store, network });
      expect(session.usedNetwork).toBe(false);
      expect(session.game.mode).toBe(mode);
      expect(session.game.score).toBeGreaterThan(0);
      expect(session.game.lines).toBeGreaterThan(0);

      const persisted = session.persist();
      expect(persisted.highScore).toBe(session.game.score);
      expect(loadPlayerState(store).highScore).toBe(session.game.score);
      expect(getLocalRecords(store, mode).some((row) => row.score === session.game.score)).toBe(
        true,
      );
    }

    expect(isOfflinePlayable('online', network)).toBe(false);
  });
});
