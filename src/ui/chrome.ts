export interface NavItem {
  view: string;
  label: string;
  ariaLabel: string;
}

export const PRIMARY_NAV: NavItem[] = [
  { view: 'menu', label: 'Hub', ariaLabel: 'Main hub menu' },
  { view: 'marathon', label: 'Marathon', ariaLabel: 'Marathon mode' },
  { view: 'sprint', label: 'Sprint', ariaLabel: 'Sprint mode' },
  { view: 'ultra', label: 'Ultra', ariaLabel: 'Ultra mode' },
  { view: 'zen', label: 'Zen', ariaLabel: 'Zen mode' },
  { view: 'versus', label: 'Versus', ariaLabel: 'Local versus mode' },
  { view: 'daily', label: 'Daily', ariaLabel: 'Daily challenge' },
  { view: 'online', label: 'Online', ariaLabel: 'Online versus' },
  { view: 'spectate', label: 'Spectate', ariaLabel: 'Spectate a match' },
  { view: 'leaderboard', label: 'Ranks', ariaLabel: 'Leaderboards' },
  { view: 'account', label: 'Account', ariaLabel: 'Account and cloud save' },
  { view: 'achievements', label: 'Trophies', ariaLabel: 'Achievements' },
  { view: 'settings', label: 'Settings', ariaLabel: 'Settings menu' },
];

export function renderPrimaryNav(currentView: string): string {
  const buttons = PRIMARY_NAV.map((item) => {
    const active = currentView === item.view ? ' is-active' : '';
    return `<button type="button" data-nav="${item.view}" class="${active.trim()}" aria-label="${item.ariaLabel}" aria-current="${currentView === item.view ? 'page' : 'false'}">${item.label}</button>`;
  }).join('');
  return `<nav class="nav" data-testid="primary-nav" aria-label="Main menu">${buttons}</nav>`;
}

export function menuItemsFromHtml(html: string): Array<{ label: string; ariaLabel: string }> {
  const items: Array<{ label: string; ariaLabel: string }> = [];
  const pattern = /<(button|option|a)[^>]*aria-label="([^"]+)"[^>]*>([^<]*)<\/\1>/gi;
  let match = pattern.exec(html);
  while (match) {
    items.push({ ariaLabel: match[2]!, label: match[3]!.trim() || match[2]! });
    match = pattern.exec(html);
  }
  return items;
}
