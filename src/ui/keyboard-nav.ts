export interface KeyboardMenuItem {
  id: string;
  label: string;
  ariaLabel: string;
  operable: boolean;
}

export interface MenuNavigator {
  items: KeyboardMenuItem[];
  focusedIndex: number;
  handleKey(key: string, shiftKey?: boolean): void;
  activate(): KeyboardMenuItem;
}

const FOCUSABLE = /<(button|input|select|textarea|a)\b([^>]*)>/gi;

export function createMenuNavigatorFromHtml(html: string): MenuNavigator {
  const items: KeyboardMenuItem[] = [];
  let match = FOCUSABLE.exec(html);
  while (match) {
    const attrs = match[2] ?? '';
    const ariaLabel = attr(attrs, 'aria-label') ?? '';
    const id =
      attr(attrs, 'data-nav') ??
      attr(attrs, 'data-action') ??
      attr(attrs, 'data-binding') ??
      attr(attrs, 'data-testid') ??
      attr(attrs, 'id') ??
      ariaLabel ??
      `item-${items.length}`;
    const disabled = /\bdisabled\b/i.test(attrs);
    items.push({
      id,
      label: ariaLabel || id,
      ariaLabel,
      operable: !disabled && ariaLabel.length > 0,
    });
    match = FOCUSABLE.exec(html);
  }

  const nav: MenuNavigator = {
    items,
    focusedIndex: 0,
    handleKey(key, shiftKey = false) {
      if (items.length === 0) return;
      if (key === 'Tab' && shiftKey) {
        nav.focusedIndex = (nav.focusedIndex - 1 + items.length) % items.length;
        return;
      }
      if (key === 'Tab' || key === 'ArrowRight' || key === 'ArrowDown') {
        nav.focusedIndex = (nav.focusedIndex + 1) % items.length;
        return;
      }
      if (key === 'ArrowLeft' || key === 'ArrowUp') {
        nav.focusedIndex = (nav.focusedIndex - 1 + items.length) % items.length;
      }
    },
    activate() {
      return items[nav.focusedIndex]!;
    },
  };
  return nav;
}

export function allItemsReachableByKeyboard(nav: MenuNavigator): boolean {
  if (nav.items.length === 0) return false;
  nav.focusedIndex = 0;
  const seen = new Set<number>([0]);
  for (let i = 0; i < nav.items.length - 1; i += 1) {
    nav.handleKey('Tab');
    seen.add(nav.focusedIndex);
  }
  return seen.size === nav.items.length && nav.items.every((item) => item.operable);
}

function attr(source: string, name: string): string | null {
  const match = new RegExp(`${name}="([^"]*)"`, 'i').exec(source);
  return match?.[1] ?? null;
}
