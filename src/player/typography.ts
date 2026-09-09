export const FONT_SIZE_IDS = ['small', 'medium', 'large'] as const;
export type FontSizeId = (typeof FONT_SIZE_IDS)[number];

export const FONT_SIZE_SCALE: Record<FontSizeId, number> = {
  small: 0.875,
  medium: 1,
  large: 1.25,
};

export interface Typography {
  fontSize: FontSizeId;
  scale: number;
  cssVars: Record<string, string>;
}

export function isFontSizeId(value: string): value is FontSizeId {
  return (FONT_SIZE_IDS as readonly string[]).includes(value);
}

export function resolveTypography(fontSize: string): Typography {
  const id: FontSizeId = isFontSizeId(fontSize) ? fontSize : 'medium';
  const scale = FONT_SIZE_SCALE[id];
  return {
    fontSize: id,
    scale,
    cssVars: { '--font-scale': String(scale) },
  };
}

export function applyTypography(
  fontSize: string,
  target: {
    dataset: { [key: string]: string | undefined };
    style: { setProperty(name: string, value: string): void };
  },
): Typography {
  const typography = resolveTypography(fontSize);
  target.dataset.fontSize = typography.fontSize;
  for (const [name, value] of Object.entries(typography.cssVars)) {
    target.style.setProperty(name, value);
  }
  return typography;
}
