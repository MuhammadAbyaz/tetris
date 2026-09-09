import { describe, expect, it } from 'vitest';
import { createMemoryStore } from '../player/persistence';
import {
  createPortableRuntime,
  detectBrowser,
  EVERGREEN_BROWSERS,
  EVERGREEN_USER_AGENTS,
  exerciseCoreGameplay,
} from './compat';

describe('TETR-83 Cross-browser portability', () => {
  it('TETR-83 It functions correctly with no browser-specific breakage', () => {
    expect(EVERGREEN_BROWSERS).toEqual(['chrome', 'firefox', 'safari', 'edge']);

    for (const browser of EVERGREEN_BROWSERS) {
      const ua = EVERGREEN_USER_AGENTS[browser];
      expect(detectBrowser(ua)).toBe(browser);

      const runtime = createPortableRuntime({ userAgent: ua, storage: createMemoryStore() });
      expect(runtime.browser).toBe(browser);
      expect(typeof runtime.now()).toBe('number');
      expect(Number.isFinite(runtime.now())).toBe(true);

      let framed = false;
      runtime.scheduleFrame(() => {
        framed = true;
      });
      expect(typeof runtime.scheduleFrame).toBe('function');

      const play = exerciseCoreGameplay(runtime);
      expect(play.ok).toBe(true);
      expect(play.browser).toBe(browser);
      expect(play.score).toBeGreaterThanOrEqual(0);
      expect(play.moved).toBe(true);
      expect(play.rotated).toBe(true);
      expect(play.dropped).toBe(true);
      expect(play.persisted).toBe(true);
      expect(framed || runtime.usesTimeoutFallback || runtime.usesAnimationFrame).toBe(true);
    }
  });
});
