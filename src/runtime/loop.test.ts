import { describe, expect, it } from 'vitest';
import { createEffectsController, LINE_CLEAR_FX_MS } from '../player/effects';
import {
  classifyDevice,
  createFrameClock,
  DESKTOP_TARGET_FPS,
  measureLineClearFrames,
  MOBILE_TARGET_FPS,
  simulatePlaySession,
  targetFpsFor,
} from './loop';

describe('TETR-79 Rendering performance and frame-timing targets', () => {
  it('TETR-79 It sustains at least 60 FPS', () => {
    const device = classifyDevice({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      maxTouchPoints: 0,
      width: 1440,
    });
    expect(device).toBe('desktop');
    expect(targetFpsFor(device)).toBe(DESKTOP_TARGET_FPS);
    expect(DESKTOP_TARGET_FPS).toBe(60);

    const clock = createFrameClock({ deviceClass: 'desktop' });
    expect(clock.targetFps).toBe(60);

    const session = simulatePlaySession({
      deviceClass: 'desktop',
      durationMs: 1000,
      workCostMs: 4,
    });
    expect(session.fps).toBeGreaterThanOrEqual(60);
    expect(session.droppedFrames).toBe(0);
    expect(session.frames).toBeGreaterThanOrEqual(60);
  });
});

describe('TETR-80 Rendering performance and frame-timing targets', () => {
  it('TETR-80 It sustains at least 30 FPS', () => {
    const device = classifyDevice({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      maxTouchPoints: 5,
      width: 375,
    });
    expect(device).toBe('mobile');
    expect(targetFpsFor(device)).toBe(MOBILE_TARGET_FPS);
    expect(MOBILE_TARGET_FPS).toBe(30);

    const session = simulatePlaySession({
      deviceClass: 'mobile',
      durationMs: 1000,
      workCostMs: 8,
    });
    expect(session.fps).toBeGreaterThanOrEqual(30);
    expect(session.droppedFrames).toBe(0);
    expect(session.frames).toBeGreaterThanOrEqual(30);
  });
});

describe('TETR-81 Rendering performance and frame-timing targets', () => {
  it('TETR-81 No frames are dropped during the animation', () => {
    const effects = createEffectsController();
    effects.notifyLineClear([0, 1]);
    expect(effects.lineClear?.playing).toBe(true);

    const result = measureLineClearFrames({
      animationMs: LINE_CLEAR_FX_MS,
      frameIntervalMs: 1000 / DESKTOP_TARGET_FPS,
      animate: (dtMs) => effects.tick(dtMs),
    });

    expect(result.droppedFrames).toBe(0);
    expect(result.frames).toBeGreaterThan(0);
    expect(effects.lineClear?.playing).toBe(false);
  });
});
