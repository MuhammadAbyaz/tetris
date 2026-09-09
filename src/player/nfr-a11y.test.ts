import { describe, expect, it } from 'vitest';
import { PIECE_COLORS } from '../game/engine';
import { createGameplayScreen } from '../ui/gameplay';
import { PRIMARY_NAV, renderPrimaryNav } from '../ui/chrome';
import { allItemsReachableByKeyboard, createMenuNavigatorFromHtml } from '../ui/keyboard-nav';
import { isColorblindSafePalette } from './colorblind';
import { createMemoryStore } from './persistence';
import { createPlayerSession, renderSettingsMenu } from './settings';
import { FONT_SIZE_SCALE, resolveTypography } from './typography';
import { COLORBLIND_PIECE_COLORS, resolveAppearance } from './themes';

describe('TETR-84 Baseline accessibility support', () => {
  it('TETR-84 All menu items are reachable and operable without a mouse or touch input', () => {
    const navHtml = renderPrimaryNav('menu');
    const nav = createMenuNavigatorFromHtml(navHtml);
    expect(nav.items.length).toBe(PRIMARY_NAV.length);
    expect(allItemsReachableByKeyboard(nav)).toBe(true);
    nav.focusedIndex = 0;
    expect(nav.activate().id).toBe(PRIMARY_NAV[0]!.view);

    const session = createPlayerSession({ store: createMemoryStore() });
    const settings = createMenuNavigatorFromHtml(renderSettingsMenu(session.settings));
    expect(settings.items.length).toBeGreaterThan(5);
    expect(allItemsReachableByKeyboard(settings)).toBe(true);
    expect(settings.items.every((item) => item.operable)).toBe(true);
  });
});

describe('TETR-85 Baseline accessibility support', () => {
  it('TETR-85 Default colors are colorblind-safe', () => {
    const session = createPlayerSession({ store: createMemoryStore() });
    const appearance = resolveAppearance(session.settings);
    expect(session.settings.colorblindPalette).toBe(false);
    expect(appearance.pieceColors).toEqual(PIECE_COLORS);
    expect(isColorblindSafePalette(PIECE_COLORS)).toBe(true);
    expect(isColorblindSafePalette(appearance.pieceColors)).toBe(true);
    expect(
      isColorblindSafePalette({
        I: '#00ff00',
        O: '#ff0000',
        T: '#00ff00',
        S: '#00ff00',
        Z: '#ff0000',
        J: '#0000ff',
        L: '#ffff00',
      }),
    ).toBe(false);
    expect(isColorblindSafePalette(COLORBLIND_PIECE_COLORS)).toBe(true);
  });
});

describe('TETR-86 Baseline accessibility support', () => {
  it('TETR-86 Text size updates accordingly', () => {
    const session = createPlayerSession({ store: createMemoryStore() });
    expect(session.settings.fontSize).toBe('medium');
    const mediumMenu = renderSettingsMenu(session.settings);
    expect(mediumMenu).toContain('data-testid="settings-font-size"');
    expect(mediumMenu).toContain('data-font-size="medium"');
    expect(mediumMenu).toContain(`--font-scale: ${FONT_SIZE_SCALE.medium}`);

    const mediumHud = createGameplayScreen({
      fontSize: session.settings.fontSize,
    }).render().html;
    expect(mediumHud).toContain('data-testid="hud-panel"');
    expect(mediumHud).toContain('data-font-size="medium"');
    expect(mediumHud).toContain(`--font-scale: ${FONT_SIZE_SCALE.medium}`);

    session.openSettings();
    session.changeDraft({ fontSize: 'large' });
    session.closeSettings();
    expect(session.settings.fontSize).toBe('large');
    expect(resolveTypography(session.settings.fontSize).scale).toBe(FONT_SIZE_SCALE.large);

    const largeMenu = renderSettingsMenu(session.settings);
    expect(largeMenu).toContain('data-font-size="large"');
    expect(largeMenu).toContain(`--font-scale: ${FONT_SIZE_SCALE.large}`);
    expect(largeMenu).not.toContain('data-font-size="medium"');

    const largeHud = createGameplayScreen({
      fontSize: session.settings.fontSize,
    }).render().html;
    expect(largeHud).toContain('data-font-size="large"');
    expect(largeHud).toContain(`--font-scale: ${FONT_SIZE_SCALE.large}`);
    expect(largeHud).not.toContain(`data-font-size="medium"`);
  });
});
