import { PIECE_COLORS, type PieceType } from '../game/engine';

export const THEME_IDS = ['classic', 'neon', 'forest'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const CONTRAST_LEVELS = ['normal', 'high'] as const;
export type ContrastLevel = (typeof CONTRAST_LEVELS)[number];

export interface ThemeTokens {
  id: ThemeId;
  name: string;
  boardBackground: string;
  background: string;
  panel: string;
  line: string;
  text: string;
  muted: string;
  pieceColors: Record<PieceType, string>;
}

export const THEMES: Record<ThemeId, ThemeTokens> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    boardBackground: '#07090d',
    background: '#0b0d12',
    panel: '#161a22',
    line: '#2a3140',
    text: '#e8edf7',
    muted: '#8b95a8',
    pieceColors: { ...PIECE_COLORS },
  },
  neon: {
    id: 'neon',
    name: 'Neon',
    boardBackground: '#14001f',
    background: '#090014',
    panel: '#1c0830',
    line: '#7c3aed',
    text: '#f5d0fe',
    muted: '#c4b5fd',
    pieceColors: {
      I: '#22d3ee',
      O: '#fde047',
      T: '#e879f9',
      S: '#4ade80',
      Z: '#fb7185',
      J: '#60a5fa',
      L: '#fb923c',
    },
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    boardBackground: '#07140c',
    background: '#04110a',
    panel: '#10241a',
    line: '#365c45',
    text: '#ecfdf3',
    muted: '#86efac',
    pieceColors: {
      I: '#5eead4',
      O: '#facc15',
      T: '#a3e635',
      S: '#34d399',
      Z: '#f87171',
      J: '#38bdf8',
      L: '#fbbf24',
    },
  },
};

/** Alternate assignment of the same Okabe–Ito hues (still colorblind-safe, distinct from default). */
export const COLORBLIND_PIECE_COLORS: Record<PieceType, string> = {
  I: '#56b4e9',
  O: '#e69f00',
  T: '#0072b2',
  S: '#f0e442',
  Z: '#cc79a7',
  J: '#009e73',
  L: '#d55e00',
};

const HIGH_CONTRAST = {
  background: '#000000',
  panel: '#111111',
  line: '#ffffff',
  text: '#ffffff',
  muted: '#f5f5f5',
  boardBackground: '#000000',
};

export interface Appearance {
  themeId: ThemeId;
  themeName: string;
  boardBackground: string;
  background: string;
  panel: string;
  line: string;
  text: string;
  muted: string;
  pieceColors: Record<PieceType, string>;
  contrast: ContrastLevel;
  colorblindPalette: boolean;
  cssVars: Record<string, string>;
}

export function isThemeId(value: string): value is ThemeId {
  return (THEME_IDS as readonly string[]).includes(value);
}

export function isContrastLevel(value: string): value is ContrastLevel {
  return (CONTRAST_LEVELS as readonly string[]).includes(value);
}

export function resolveTheme(themeId: string): ThemeTokens {
  return THEMES[isThemeId(themeId) ? themeId : 'classic'];
}

export function resolvePieceColors(input: {
  theme: string;
  colorblindPalette: boolean;
}): Record<PieceType, string> {
  if (input.colorblindPalette) return { ...COLORBLIND_PIECE_COLORS };
  return { ...resolveTheme(input.theme).pieceColors };
}

export function resolveAppearance(input: {
  theme: string;
  contrast: string;
  colorblindPalette: boolean;
}): Appearance {
  const theme = resolveTheme(input.theme);
  const contrast: ContrastLevel = isContrastLevel(input.contrast) ? input.contrast : 'normal';
  const high = contrast === 'high';
  const pieceColors = resolvePieceColors({
    theme: theme.id,
    colorblindPalette: input.colorblindPalette,
  });
  const boardBackground = high ? HIGH_CONTRAST.boardBackground : theme.boardBackground;
  const background = high ? HIGH_CONTRAST.background : theme.background;
  const panel = high ? HIGH_CONTRAST.panel : theme.panel;
  const line = high ? HIGH_CONTRAST.line : theme.line;
  const text = high ? HIGH_CONTRAST.text : theme.text;
  const muted = high ? HIGH_CONTRAST.muted : theme.muted;
  const cssVars: Record<string, string> = {
    '--bg': background,
    '--panel': panel,
    '--line': line,
    '--text': text,
    '--muted': muted,
    '--board-bg': boardBackground,
    '--piece-i': pieceColors.I,
    '--piece-o': pieceColors.O,
    '--piece-t': pieceColors.T,
    '--piece-s': pieceColors.S,
    '--piece-z': pieceColors.Z,
    '--piece-j': pieceColors.J,
    '--piece-l': pieceColors.L,
  };
  return {
    themeId: theme.id,
    themeName: theme.name,
    boardBackground,
    background,
    panel,
    line,
    text,
    muted,
    pieceColors,
    contrast,
    colorblindPalette: Boolean(input.colorblindPalette),
    cssVars,
  };
}

export function applyAppearance(
  input: { theme: string; contrast: string; colorblindPalette: boolean },
  target: {
    dataset: { [key: string]: string | undefined };
    style: { setProperty(name: string, value: string): void };
  },
): Appearance {
  const appearance = resolveAppearance(input);
  target.dataset.theme = appearance.themeId;
  target.dataset.contrast = appearance.contrast;
  target.dataset.colorblind = String(appearance.colorblindPalette);
  for (const [name, value] of Object.entries(appearance.cssVars)) {
    target.style.setProperty(name, value);
  }
  return appearance;
}
