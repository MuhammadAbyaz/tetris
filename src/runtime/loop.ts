export const DESKTOP_TARGET_FPS = 60;
export const MOBILE_TARGET_FPS = 30;

export type DeviceClass = 'desktop' | 'mobile';

export interface FrameSample {
  dtMs: number;
  dropped: boolean;
}

export interface FrameClock {
  deviceClass: DeviceClass;
  targetFps: number;
  frameBudgetMs: number;
  samples: FrameSample[];
  droppedFrames: number;
  tick(nowMs: number, work?: (dtMs: number) => void, workCostMs?: number): FrameSample;
  averageFps(): number;
  reset(): void;
}

export function classifyDevice(env: {
  userAgent?: string;
  maxTouchPoints?: number;
  width?: number;
}): DeviceClass {
  const ua = env.userAgent ?? '';
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) return 'mobile';
  if ((env.maxTouchPoints ?? 0) > 0 && (env.width ?? 1024) < 900) return 'mobile';
  return 'desktop';
}

export function targetFpsFor(device: DeviceClass): number {
  return device === 'mobile' ? MOBILE_TARGET_FPS : DESKTOP_TARGET_FPS;
}

export function frameBudgetMs(fps: number): number {
  return 1000 / fps;
}

export function createFrameClock(options: { deviceClass: DeviceClass }): FrameClock {
  const targetFps = targetFpsFor(options.deviceClass);
  const budget = frameBudgetMs(targetFps);
  const dropLimit = budget * 1.5;
  let last = 0;
  const clock: FrameClock = {
    deviceClass: options.deviceClass,
    targetFps,
    frameBudgetMs: budget,
    samples: [],
    droppedFrames: 0,
    tick(nowMs, work, workCostMs = 0) {
      const dtMs = last === 0 ? budget : Math.max(0, nowMs - last);
      last = nowMs;
      work?.(dtMs);
      const dropped = dtMs > dropLimit || workCostMs > budget;
      const sample: FrameSample = { dtMs, dropped };
      clock.samples.push(sample);
      if (dropped) clock.droppedFrames += 1;
      return sample;
    },
    averageFps() {
      if (clock.samples.length === 0) return 0;
      const total = clock.samples.reduce((sum, sample) => sum + sample.dtMs, 0);
      const fps = (clock.samples.length * 1000) / total;
      return Math.round(fps * 100) / 100;
    },
    reset() {
      last = 0;
      clock.samples = [];
      clock.droppedFrames = 0;
    },
  };
  return clock;
}

export function simulatePlaySession(options: {
  deviceClass: DeviceClass;
  durationMs: number;
  frameIntervalMs?: number;
  workCostMs?: number;
  work?: (dtMs: number) => void;
}): { fps: number; droppedFrames: number; frames: number } {
  const clock = createFrameClock({ deviceClass: options.deviceClass });
  const interval = options.frameIntervalMs ?? clock.frameBudgetMs;
  const workCost = options.workCostMs ?? 1;
  let t = 0;
  let frames = 0;
  while (t < options.durationMs) {
    t += interval;
    clock.tick(t, options.work, workCost);
    frames += 1;
  }
  return { fps: clock.averageFps(), droppedFrames: clock.droppedFrames, frames };
}

export function measureLineClearFrames(options: {
  animationMs: number;
  frameIntervalMs: number;
  animate: (dtMs: number) => void;
  workCostMs?: number;
}): { droppedFrames: number; frames: number } {
  const clock = createFrameClock({ deviceClass: 'desktop' });
  let t = 0;
  let frames = 0;
  while (t < options.animationMs) {
    t += options.frameIntervalMs;
    clock.tick(t, options.animate, options.workCostMs ?? 1);
    frames += 1;
  }
  return { droppedFrames: clock.droppedFrames, frames };
}
