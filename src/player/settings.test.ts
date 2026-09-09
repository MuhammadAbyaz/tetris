import { describe, expect, it } from 'vitest';
import { createGame } from '../game/engine';
import { handleKeyDown } from './controls';
import { createMemoryStore } from './persistence';
import { createPlayerSession, renderSettingsMenu } from './settings';

describe('TETR-53 Settings menu for bindings, volume, and DAS/ARR', () => {
  it('TETR-53 Controls are present for key bindings, volume level, and DAS/ARR values', () => {
    const session = createPlayerSession({ store: createMemoryStore() });
    const html = session.openSettings();
    expect(html).toContain('data-testid="settings-menu"');
    expect(html).toContain('data-testid="settings-bindings"');
    expect(html).toContain('data-testid="settings-volume"');
    expect(html).toContain('data-testid="settings-das"');
    expect(html).toContain('data-testid="settings-arr"');
    expect(html).toContain('data-binding="moveLeft"');
    expect(html).toContain('data-binding="pause"');
    expect(renderSettingsMenu(session.settings)).toContain('data-testid="settings-volume"');
  });
});

describe('TETR-54 Settings menu for bindings, volume, and DAS/ARR', () => {
  it('TETR-54 The new value is applied to subsequent gameplay', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['T', 'I'] });
    game.setActive('T', 4, 10, 0);
    const session = createPlayerSession({ store: createMemoryStore(), game });
    session.openSettings();
    session.changeDraft({ dasMs: 80, arrMs: 5, volume: 0.4, muted: true });
    session.captureBinding('rotateCw', 'p');
    session.closeSettings();

    expect(session.menuOpen).toBe(false);
    expect(game.dasMs).toBe(80);
    expect(game.arrMs).toBe(5);
    expect(session.audio.volume).toBe(0.4);
    expect(session.audio.muted).toBe(true);

    const rotation = game.active!.rotation;
    handleKeyDown(session.settings.bindings, game, 'p');
    expect(game.active?.rotation).toBe((rotation + 1) % 4);
    handleKeyDown(session.settings.bindings, game, 'x');
    expect(game.active?.rotation).toBe((rotation + 1) % 4);
  });
});
