import { describe, expect, it } from 'vitest';
import { menuItemsFromHtml, PRIMARY_NAV, renderPrimaryNav } from '../ui/chrome';
import { createMemoryStore } from './persistence';
import { createPlayerSession, renderSettingsMenu } from './settings';

describe('TETR-67 Enhanced accessibility options', () => {
  it('TETR-67 Menu items are announced with accessible labels', () => {
    const nav = renderPrimaryNav('menu');
    expect(nav).toContain('aria-label="Main menu"');
    const navItems = menuItemsFromHtml(nav);
    expect(navItems.length).toBe(PRIMARY_NAV.length);
    for (const item of PRIMARY_NAV) {
      expect(nav).toContain(`aria-label="${item.ariaLabel}"`);
    }

    const session = createPlayerSession({ store: createMemoryStore() });
    const settings = renderSettingsMenu(session.settings);
    expect(settings).toContain('aria-label="Settings menu"');
    expect(settings).toContain('aria-label="Volume"');
    expect(settings).toContain('aria-label="Enable background music"');
    expect(settings).toContain('aria-label="Music track"');
    expect(settings).toContain('aria-label="Theme"');
    expect(settings).toContain('aria-label="Colorblind-friendly palette"');
    expect(settings).toContain('aria-label="Contrast"');
    expect(settings).toContain('aria-label="Move left key binding"');
    expect(settings).toContain('aria-label="Close settings"');

    const labeled = menuItemsFromHtml(settings);
    expect(labeled.length).toBeGreaterThan(5);
    expect(labeled.every((item) => item.ariaLabel.length > 0)).toBe(true);
  });
});
