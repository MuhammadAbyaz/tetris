import { describe, expect, it } from 'vitest';
import { computeGameLayout } from './layout';

describe('TETR-55 Responsive UI scaling across screen sizes', () => {
  it('TETR-55 The playfield, HUD, and controls remain visible and usable without horizontal overflow', () => {
    const layout = computeGameLayout(320);
    expect(layout.viewportWidth).toBe(320);
    expect(layout.playfield.visible).toBe(true);
    expect(layout.hud.visible).toBe(true);
    expect(layout.controls.visible).toBe(true);
    expect(layout.overflowX).toBe(false);
    expect(layout.contentWidth).toBeLessThanOrEqual(320);
    expect(layout.playfield.w).toBeGreaterThan(0);
    expect(layout.hud.w).toBeGreaterThan(0);
    expect(layout.controls.w).toBeGreaterThan(0);
  });
});

describe('TETR-56 Responsive UI scaling across screen sizes', () => {
  it('TETR-56 All UI elements (playfield, next queue, hold box, score panel) scale and reposition without overlapping', () => {
    const mobile = computeGameLayout(320);
    const tablet = computeGameLayout(768);
    const desktop = computeGameLayout(1440);

    for (const layout of [mobile, tablet, desktop]) {
      expect(layout.overlapping).toBe(false);
      expect(layout.playfield.visible).toBe(true);
      expect(layout.nextQueue.visible).toBe(true);
      expect(layout.holdBox.visible).toBe(true);
      expect(layout.scorePanel.visible).toBe(true);
      expect(layout.overflowX).toBe(false);
    }

    expect(desktop.cellSize).toBeGreaterThan(mobile.cellSize);
    expect(desktop.holdBox.position).toBe('left');
    expect(desktop.nextQueue.position).toBe('right');
    expect(desktop.playfield.position).toBe('center');
    expect(mobile.holdBox.position).toBe('below');
    expect(mobile.nextQueue.position).toBe('below');
    expect(tablet.playfield.scale).not.toBe(desktop.playfield.scale);
  });
});
