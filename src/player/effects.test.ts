import { describe, expect, it } from 'vitest';
import { createGame, VISIBLE_COLS, type Game } from '../game/engine';
import { createEffectsController } from './effects';
import { createGameplayScreen } from '../ui/gameplay';

function clearOneLine(game: Game): void {
  for (let x = 0; x < VISIBLE_COLS - 1; x += 1) game.occupy(x, 0, 'J');
  game.setActive('I', VISIBLE_COLS - 3, 8, 1);
  game.hardDrop();
}

describe('TETR-60 Animated line-clear and level-up effects', () => {
  it('TETR-60 An enhanced visual effect animation plays for the cleared rows', () => {
    const effects = createEffectsController();
    const game = createGame({
      gravityMs: 1_000_000,
      pieceSequence: ['I', 'I', 'T', 'O'],
    });
    effects.attach(game);
    clearOneLine(game);

    expect(game.getClearingRows().length).toBeGreaterThan(0);
    expect(effects.lineClear).not.toBeNull();
    expect(effects.lineClear?.playing).toBe(true);
    expect(effects.lineClear?.enhanced).toBe(true);
    expect(effects.lineClear?.style).toBe('burst');
    expect(effects.lineClear?.rows).toEqual(game.getClearingRows());

    const html = createGameplayScreen({ game, effects }).render().html;
    expect(html).toContain('data-testid="line-clear-effect"');
    expect(html).toMatch(/data-testid="line-clear-effect"[^>]*data-playing="true"/);
    expect(html).toMatch(/data-testid="line-clear-effect"[^>]*data-enhanced="true"/);
  });
});

describe('TETR-61 Animated line-clear and level-up effects', () => {
  it('TETR-61 A distinct level-up visual effect plays', () => {
    const effects = createEffectsController();
    const game = createGame({
      gravityMs: 1_000_000,
      linesPerLevel: 1,
      pieceSequence: ['I', 'I', 'T', 'O'],
    });
    effects.attach(game);
    const levelBefore = game.level;
    clearOneLine(game);

    expect(game.level).toBeGreaterThan(levelBefore);
    expect(effects.levelUp).not.toBeNull();
    expect(effects.levelUp?.playing).toBe(true);
    expect(effects.levelUp?.enhanced).toBe(true);
    expect(effects.levelUp?.style).toBe('flourish');
    expect(effects.levelUp?.level).toBe(game.level);
    expect(effects.levelUp?.kind).toBe('levelUp');
    expect(effects.lineClear?.kind).toBe('lineClear');

    const html = createGameplayScreen({ game, effects }).render().html;
    expect(html).toContain('data-testid="level-up-effect"');
    expect(html).toMatch(/data-testid="level-up-effect"[^>]*data-playing="true"/);
    expect(html).toContain(`data-level="${game.level}"`);
  });
});
