import { describe, expect, it } from 'vitest';
import { createGame } from '../game/engine';
import { actionForKey, DEFAULT_BINDINGS, handleKeyDown, remapBinding } from './controls';

function playable() {
  const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['T', 'I', 'O', 'J'] });
  game.setActive('T', 4, 10, 0);
  return game;
}

describe('TETR-47 Remappable keyboard controls', () => {
  it('TETR-47 Each bound key triggers its corresponding action', () => {
    const move = playable();
    expect(actionForKey(DEFAULT_BINDINGS, 'ArrowLeft')).toBe('moveLeft');
    handleKeyDown(DEFAULT_BINDINGS, move, 'ArrowLeft');
    expect(move.active?.x).toBe(3);

    const right = playable();
    handleKeyDown(DEFAULT_BINDINGS, right, 'ArrowRight');
    expect(right.active?.x).toBe(5);

    const soft = playable();
    const softY = soft.active!.y;
    handleKeyDown(DEFAULT_BINDINGS, soft, 'ArrowDown');
    soft.update(40);
    expect(soft.active?.y).toBeLessThan(softY);

    const drop = playable();
    handleKeyDown(DEFAULT_BINDINGS, drop, ' ');
    expect(drop.active?.type).not.toBe('T');
    expect(drop.boardHasType('T')).toBe(true);

    const rotate = playable();
    handleKeyDown(DEFAULT_BINDINGS, rotate, 'x');
    expect(rotate.active?.rotation).toBe(1);

    const hold = playable();
    handleKeyDown(DEFAULT_BINDINGS, hold, 'c');
    expect(hold.hold).toBe('T');

    const pause = playable();
    handleKeyDown(DEFAULT_BINDINGS, pause, 'Escape');
    expect(pause.isPaused()).toBe(true);
  });
});

describe('TETR-48 Remappable keyboard controls', () => {
  it('TETR-48 The reassigned action is triggered instead of the default', () => {
    const bindings = remapBinding(DEFAULT_BINDINGS, 'moveLeft', 'q');
    expect(actionForKey(bindings, 'q')).toBe('moveLeft');
    expect(actionForKey(bindings, 'ArrowLeft')).toBeNull();

    const remapped = playable();
    handleKeyDown(bindings, remapped, 'q');
    expect(remapped.active?.x).toBe(3);

    const original = playable();
    const startX = original.active!.x;
    handleKeyDown(bindings, original, 'ArrowLeft');
    expect(original.active?.x).toBe(startX);
  });
});
