import { VISIBLE_COLS, type Game, type PlayMode } from '../game/engine';
import { createModeGame } from '../game/modes';
import { submitLocalRecord } from '../player/local-leaderboard';
import { createPlayerSession, type PlayerSession } from '../player/settings';
import type { KeyValueStore } from '../player/persistence';

export const OFFLINE_PLAYABLE_MODES = ['marathon', 'sprint', 'ultra', 'zen'] as const;
export type OfflinePlayableMode = (typeof OFFLINE_PLAYABLE_MODES)[number];

export function isOfflinePlayable(
  mode: string,
  network: { online: boolean },
): mode is OfflinePlayableMode {
  void network;
  return (OFFLINE_PLAYABLE_MODES as readonly string[]).includes(mode);
}

export function playOfflineSession(options: {
  mode: OfflinePlayableMode;
  store: KeyValueStore;
  network: { online: boolean };
}): {
  game: Game;
  usedNetwork: boolean;
  session: PlayerSession;
  persist(): { highScore: number };
} {
  if (!options.network.online && !isOfflinePlayable(options.mode, options.network)) {
    throw new Error(`${options.mode} requires a network connection`);
  }
  const session = createPlayerSession({ store: options.store });
  const game = createModeGame(options.mode, {
    gravityMs: 1_000_000,
    pieceSequence: ['I', 'T', 'O', 'J'],
    dasMs: session.settings.dasMs,
    arrMs: session.settings.arrMs,
  });
  clearBottomLine(game);
  const usedNetwork = false;
  return {
    game,
    usedNetwork,
    session,
    persist() {
      const highScore = session.persistScore(game.score);
      submitLocalRecord(options.store, {
        mode: game.mode as PlayMode,
        score: game.score,
        lines: game.lines,
        level: game.level,
        elapsedMs: game.elapsedMs,
      });
      return { highScore };
    },
  };
}

function clearBottomLine(game: Game): void {
  for (let x = 0; x < VISIBLE_COLS - 1; x += 1) {
    game.occupy(x, 0, 'J');
  }
  game.setActive('I', VISIBLE_COLS - 3, 8, 1);
  game.hardDrop();
}
