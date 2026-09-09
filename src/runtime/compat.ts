import { createModeGame } from '../game/modes';
import {
  createMemoryStore,
  loadPlayerState,
  recordHighScore,
  type KeyValueStore,
} from '../player/persistence';

export const EVERGREEN_BROWSERS = ['chrome', 'firefox', 'safari', 'edge'] as const;
export type EvergreenBrowser = (typeof EVERGREEN_BROWSERS)[number];

export const EVERGREEN_USER_AGENTS: Record<EvergreenBrowser, string> = {
  chrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  safari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
};

export function detectBrowser(userAgent: string): EvergreenBrowser | 'other' {
  const ua = userAgent;
  if (/Edg\//i.test(ua)) return 'edge';
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'chrome';
  if (/Firefox\//i.test(ua)) return 'firefox';
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'safari';
  return 'other';
}

export interface PortableRuntime {
  browser: EvergreenBrowser | 'other';
  usesAnimationFrame: boolean;
  usesTimeoutFallback: boolean;
  storage: KeyValueStore;
  now(): number;
  scheduleFrame(callback: (time: number) => void): number;
  cancelFrame(id: number): void;
}

export function createPortableRuntime(options: {
  userAgent: string;
  storage?: KeyValueStore;
}): PortableRuntime {
  const usesAnimationFrame = typeof requestAnimationFrame === 'function';
  const usesTimeoutFallback = !usesAnimationFrame;
  const storage = options.storage ?? createMemoryStore();
  return {
    browser: detectBrowser(options.userAgent),
    usesAnimationFrame,
    usesTimeoutFallback,
    storage,
    now() {
      if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
      }
      return Date.now();
    },
    scheduleFrame(callback) {
      if (usesAnimationFrame) return requestAnimationFrame(callback);
      return setTimeout(() => callback(Date.now()), 16) as unknown as number;
    },
    cancelFrame(id) {
      if (usesAnimationFrame) cancelAnimationFrame(id);
      else clearTimeout(id);
    },
  };
}

export function exerciseCoreGameplay(runtime: PortableRuntime): {
  ok: true;
  browser: PortableRuntime['browser'];
  score: number;
  moved: boolean;
  rotated: boolean;
  dropped: boolean;
  persisted: boolean;
} {
  const game = createModeGame('marathon', {
    gravityMs: 1_000_000,
    pieceSequence: ['T', 'I', 'O'],
  });
  const startX = game.active?.x ?? 0;
  const startRotation = game.active?.rotation ?? 0;
  game.pressLeft();
  const moved = (game.active?.x ?? startX) !== startX;
  game.rotateCw();
  const rotated = (game.active?.rotation ?? startRotation) !== startRotation;
  game.hardDrop();
  const dropped = Boolean(game.lastLock) || game.score > 0;
  recordHighScore(runtime.storage, game.score);
  const persisted = loadPlayerState(runtime.storage).highScore === game.score;
  return {
    ok: true,
    browser: runtime.browser,
    score: game.score,
    moved,
    rotated,
    dropped,
    persisted,
  };
}
