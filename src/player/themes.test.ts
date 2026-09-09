import { describe, expect, it } from 'vitest';
import { PIECE_COLORS } from '../game/engine';
import { createMemoryStore } from './persistence';
import { createPlayerSession } from './settings';
import { COLORBLIND_PIECE_COLORS, resolveAppearance, THEMES } from './themes';

describe('TETR-59 Themes and skins', () => {
  it('TETR-59 Block colors and/or board background update to match the selected theme', () => {
    const session = createPlayerSession({ store: createMemoryStore() });
    const html = session.openSettings();
    expect(html).toContain('data-testid="settings-theme"');
    expect(Object.keys(THEMES).length).toBeGreaterThan(1);

    const classic = resolveAppearance({
      theme: 'classic',
      contrast: 'normal',
      colorblindPalette: false,
    });
    session.changeDraft({ theme: 'neon' });
    session.closeSettings();

    const neon = resolveAppearance(session.settings);
    expect(session.settings.theme).toBe('neon');
    expect(neon.themeId).toBe('neon');
    expect(neon.boardBackground).toBe(THEMES.neon.boardBackground);
    expect(neon.boardBackground).not.toBe(classic.boardBackground);
    expect(neon.pieceColors).toEqual(THEMES.neon.pieceColors);
    expect(neon.pieceColors).not.toEqual(classic.pieceColors);
    expect(classic.pieceColors).toEqual(PIECE_COLORS);
  });
});

describe('TETR-65 Enhanced accessibility options', () => {
  it('TETR-65 Piece colors use the colorblind-safe palette instead of the default', () => {
    const session = createPlayerSession({ store: createMemoryStore() });
    const defaultColors = resolveAppearance(session.settings).pieceColors;
    expect(defaultColors).toEqual(PIECE_COLORS);

    session.openSettings();
    expect(session.openSettings()).toContain('data-testid="settings-colorblind"');
    session.changeDraft({ colorblindPalette: true });
    session.closeSettings();

    const playfield = resolveAppearance(session.settings);
    expect(session.settings.colorblindPalette).toBe(true);
    expect(playfield.pieceColors).toEqual(COLORBLIND_PIECE_COLORS);
    expect(playfield.pieceColors).not.toEqual(defaultColors);
    expect(playfield.pieceColors.I).not.toBe(PIECE_COLORS.I);
  });
});

describe('TETR-66 Enhanced accessibility options', () => {
  it('TETR-66 Contrast levels update accordingly', () => {
    const session = createPlayerSession({ store: createMemoryStore() });
    const normal = resolveAppearance(session.settings);
    expect(normal.contrast).toBe('normal');

    session.openSettings();
    expect(session.openSettings()).toContain('data-testid="settings-contrast"');
    session.changeDraft({ contrast: 'high' });
    session.closeSettings();

    const high = resolveAppearance(session.settings);
    expect(session.settings.contrast).toBe('high');
    expect(high.contrast).toBe('high');
    expect(high.text).not.toBe(normal.text);
    expect(high.background).not.toBe(normal.background);
    expect(high.line).not.toBe(normal.line);
    expect(high.cssVars['--text']).toBe(high.text);
    expect(high.cssVars['--bg']).toBe(high.background);
  });
});
