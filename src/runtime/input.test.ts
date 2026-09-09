import { describe, expect, it } from 'vitest';
import { createGame } from '../game/engine';
import { dispatchAction } from '../player/controls';
import { applyInputWithPaint, INPUT_LATENCY_BUDGET_MS } from './input';

describe('TETR-82 Input latency target', () => {
  it('TETR-82 The added latency from input to visible response is under approximately 16ms', () => {
    expect(INPUT_LATENCY_BUDGET_MS).toBeLessThanOrEqual(16);

    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['T', 'I', 'O'] });
    game.setActive('T', 4, 10, 0);
    const startX = game.active!.x;
    const visible = { x: startX, paintedAt: 0 };
    let now = 1_000;

    const move = applyInputWithPaint({
      inputAtMs: now,
      now: () => now,
      apply: () => {
        now += 0.4;
        dispatchAction(game, 'moveLeft');
        return game.active!.x;
      },
      paint: () => {
        now += 0.6;
        visible.x = game.active!.x;
        visible.paintedAt = now;
      },
    });

    expect(move.latencyMs).toBeLessThan(INPUT_LATENCY_BUDGET_MS);
    expect(visible.x).toBe(startX - 1);
    expect(visible.paintedAt).toBeGreaterThan(1_000);

    const beforeRotate = game.active!.rotation;
    const rotate = applyInputWithPaint({
      inputAtMs: now,
      now: () => now,
      apply: () => {
        now += 0.3;
        dispatchAction(game, 'rotateCw');
        return game.active!.rotation;
      },
      paint: () => {
        now += 0.4;
        visible.paintedAt = now;
      },
    });
    expect(rotate.latencyMs).toBeLessThan(INPUT_LATENCY_BUDGET_MS);
    expect(game.active!.rotation).toBe(((beforeRotate + 1) % 4) as 0 | 1 | 2 | 3);

    const drop = applyInputWithPaint({
      inputAtMs: now,
      now: () => now,
      apply: () => {
        now += 0.5;
        dispatchAction(game, 'hardDrop');
        return game.score;
      },
      paint: () => {
        now += 0.5;
        visible.paintedAt = now;
      },
    });
    expect(drop.latencyMs).toBeLessThan(INPUT_LATENCY_BUDGET_MS);
    expect(game.active?.y).not.toBe(10);
  });
});
