import { describe, expect, it } from 'vitest';
import { createGame } from '../game/engine';
import { dispatchAction } from './controls';
import {
  actionForGesture,
  applyGesture,
  applyTouch,
  renderTouchControls,
  TOUCH_CONTROLS,
} from './touch';

function twins() {
  const left = createGame({ gravityMs: 1_000_000, pieceSequence: ['T', 'I', 'O'] });
  const right = createGame({ gravityMs: 1_000_000, pieceSequence: ['T', 'I', 'O'] });
  left.setActive('T', 4, 10, 0);
  right.setActive('T', 4, 10, 0);
  return { left, right };
}

describe('TETR-49 Touch controls for mobile', () => {
  it('TETR-49 Buttons or gesture zones exist for move left/right, rotate, soft drop, hard drop, and hold', () => {
    const html = renderTouchControls();
    expect(html).toContain('data-testid="touch-controls"');
    expect(html).toContain('data-gesture-zones="true"');
    for (const control of TOUCH_CONTROLS) {
      expect(html).toContain(`data-touch="${control}"`);
      expect(html).toContain(`data-testid="touch-${control}"`);
    }
    expect(TOUCH_CONTROLS).toEqual([
      'moveLeft',
      'moveRight',
      'rotate',
      'softDrop',
      'hardDrop',
      'hold',
    ]);
  });
});

describe('TETR-50 Touch controls for mobile', () => {
  it('TETR-50 The same game action fires as the equivalent keyboard input', () => {
    const cases = [
      { touch: 'moveLeft' as const, action: 'moveLeft' as const, gesture: 'left' as const },
      { touch: 'moveRight' as const, action: 'moveRight' as const, gesture: 'right' as const },
      { touch: 'rotate' as const, action: 'rotateCw' as const },
      { touch: 'hold' as const, action: 'hold' as const },
      { touch: 'hardDrop' as const, action: 'hardDrop' as const, gesture: 'up' as const },
    ];

    for (const item of cases) {
      const { left, right } = twins();
      dispatchAction(left, item.action);
      applyTouch(right, item.touch);
      expect(right.active).toEqual(left.active);
      expect(right.hold).toEqual(left.hold);
      expect(right.board).toEqual(left.board);
      if (item.gesture) {
        const swiped = twins();
        dispatchAction(swiped.left, item.action);
        applyGesture(swiped.right, { type: 'swipe', direction: item.gesture });
        expect(swiped.right.active).toEqual(swiped.left.active);
        expect(actionForGesture({ type: 'swipe', direction: item.gesture })).toBe(item.action);
      }
    }

    const soft = twins();
    dispatchAction(soft.left, 'softDrop');
    applyGesture(soft.right, { type: 'swipe', direction: 'down' });
    soft.left.update(40);
    soft.right.update(40);
    expect(soft.right.active).toEqual(soft.left.active);
  });
});
