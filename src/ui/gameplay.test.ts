import { describe, expect, it } from 'vitest';
import { createGame, VISIBLE_COLS, type Game } from '../game/engine';
import { createGameplayScreen, formatElapsed, parseGameplayLayout } from './gameplay';

function forceGameOver(game: Game): void {
  game.setActive('T', 4, 4, 0);
  for (let y = 18; y < 24; y += 1) {
    for (let x = 0; x < VISIBLE_COLS; x += 1) {
      if (x !== 9) game.occupy(x, y, 'I');
    }
  }
  game.hardDrop();
}

describe('TETR-74 Clear visual hierarchy layout', () => {
  it('TETR-74 The playfield is centered with the next-queue and hold box positioned on either side of it', () => {
    const screen = createGameplayScreen();
    const rendered = screen.render();
    const layout = parseGameplayLayout(rendered.html);

    expect(layout.columns).toEqual(['hold', 'playfield', 'next']);
    expect(layout.playfieldPosition).toBe('center');
    expect(layout.holdPosition).toBe('left');
    expect(layout.nextQueuePosition).toBe('right');
    expect(rendered.html).toContain('data-testid="playfield"');
    expect(rendered.html).toContain('data-testid="hold-box"');
    expect(rendered.html).toContain('data-testid="next-queue"');
  });
});

describe('TETR-75 Clear visual hierarchy layout', () => {
  it('TETR-75 The score, level, and lines-cleared panel remains visible without requiring additional navigation', () => {
    const screen = createGameplayScreen({
      game: createGame({ gravityMs: 1_000_000, pieceSequence: ['T', 'I', 'O'] }),
    });

    const first = screen.render();
    expect(first.hud.visible).toBe(true);
    expect(first.html).toContain('data-testid="hud-panel"');
    expect(first.html).toContain('data-testid="hud-score"');
    expect(first.html).toContain('data-testid="hud-level"');
    expect(first.html).toContain('data-testid="hud-lines"');
    expect(first.html).toContain('data-testid="hud-combo"');
    expect(first.html).toContain('data-testid="hud-back-to-back"');
    expect(first.hud.score).toBe(screen.game.score);
    expect(first.hud.level).toBe(screen.game.level);
    expect(first.hud.lines).toBe(screen.game.lines);
    expect(first.hud.combo).toBe(screen.game.combo);
    expect(first.hud.backToBack).toBe(screen.game.backToBackActive);

    screen.game.setActive('T', 4, 10, 0);
    screen.game.tryMove(-1, 0);
    screen.game.update(16);
    const midGame = screen.render();

    expect(midGame.hud.visible).toBe(true);
    expect(midGame.view).toBe('playing');
    expect(midGame.html).toMatch(/data-testid="hud-panel"[^>]*data-always-visible="true"/);
    expect(midGame.html).toContain(`data-testid="hud-score"`);
    expect(midGame.html).toContain(`data-testid="hud-level"`);
    expect(midGame.html).toContain(`data-testid="hud-lines"`);
    expect(midGame.html).toContain(`data-testid="hud-combo"`);
    expect(midGame.html).toContain(`data-testid="hud-back-to-back"`);
  });
});

describe('TETR-76 Game-over screen with final stats', () => {
  it('TETR-76 It displays final score, lines cleared, level reached, and elapsed time', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['I', 'I', 'T'] });
    for (let x = 0; x < 9; x += 1) {
      game.occupy(x, 0, 'J');
    }
    game.setActive('I', 7, 8, 1);
    game.update(2540);
    game.hardDrop();
    expect(game.lines).toBeGreaterThan(0);

    forceGameOver(game);
    expect(game.isOver()).toBe(true);

    const screen = createGameplayScreen({ game });
    const rendered = screen.render();

    expect(rendered.phase).toBe('game-over');
    expect(rendered.gameOver).not.toBeNull();
    expect(rendered.gameOver?.score).toBe(game.score);
    expect(rendered.gameOver?.lines).toBe(game.lines);
    expect(rendered.gameOver?.level).toBe(game.level);
    expect(rendered.gameOver?.elapsedMs).toBe(game.elapsedMs);
    expect(rendered.gameOver?.reason).toBe(game.getGameOverReason());
    expect(rendered.html).toContain('data-testid="game-over-screen"');
    expect(rendered.html).toContain('data-testid="game-over-reason"');
    expect(rendered.html).toContain(`data-testid="final-score"`);
    expect(rendered.html).toContain(String(game.score));
    expect(rendered.html).toContain(`data-testid="final-lines"`);
    expect(rendered.html).toContain(String(game.lines));
    expect(rendered.html).toContain(`data-testid="final-level"`);
    expect(rendered.html).toContain(String(game.level));
    expect(rendered.html).toContain(`data-testid="final-time"`);
    expect(rendered.html).toContain(formatElapsed(game.elapsedMs));
  });
});

describe('TETR-77 Game-over screen with final stats', () => {
  it('TETR-77 The corresponding action (new game or return to main menu) occurs', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['T', 'I'] });
    game.update(800);
    forceGameOver(game);
    const screen = createGameplayScreen({ game });
    expect(screen.render().phase).toBe('game-over');

    screen.selectRestart();
    const restarted = screen.render();
    expect(restarted.view).toBe('playing');
    expect(restarted.phase).toBe('playing');
    expect(screen.game.isOver()).toBe(false);
    expect(screen.game.score).toBe(0);
    expect(screen.game.lines).toBe(0);
    expect(screen.game.elapsedMs).toBe(0);
    expect(restarted.gameOver).toBeNull();
    expect(restarted.html).toContain('data-testid="playfield"');

    forceGameOver(screen.game);
    expect(screen.render().phase).toBe('game-over');
    screen.selectMenu();
    const menu = screen.render();
    expect(menu.view).toBe('menu');
    expect(menu.html).toContain('data-testid="main-menu"');
    expect(menu.phase).not.toBe('game-over');
  });
});

describe('TETR-78 Non-intrusive pause overlay', () => {
  it('TETR-78 It obscures the playfield so that no board state changes are visible through the overlay', () => {
    const game = createGame({ gravityMs: 50, pieceSequence: ['T', 'I'] });
    game.setActive('T', 4, 12, 0);
    const screen = createGameplayScreen({ game });

    screen.pause();
    const paused = screen.render();
    const pieceY = game.active?.y;

    expect(game.isPaused()).toBe(true);
    expect(paused.phase).toBe('paused');
    expect(paused.pauseOverlay.visible).toBe(true);
    expect(paused.pauseOverlay.coversPlayfield).toBe(true);
    expect(paused.pauseOverlay.opaque).toBe(true);
    expect(paused.pauseOverlay.revealsPlayfield).toBe(false);
    expect(paused.html).toContain('data-testid="pause-overlay"');
    expect(paused.html).toMatch(/data-testid="pause-overlay"[^>]*data-covers-playfield="true"/);
    expect(paused.html).toMatch(/data-testid="pause-overlay"[^>]*data-opaque="true"/);
    expect(paused.html).toMatch(/data-testid="playfield"[^>]*data-obscured="true"/);

    game.update(500);
    expect(game.active?.y).toBe(pieceY);
    expect(game.isOver()).toBe(false);

    const stillPaused = screen.render();
    expect(stillPaused.pauseOverlay.visible).toBe(true);
    expect(stillPaused.pauseOverlay.revealsPlayfield).toBe(false);
  });
});
