export type LayoutBreakpoint = 'narrow' | 'mobile' | 'desktop' | 'wide';
export type RegionPosition = 'top' | 'left' | 'center' | 'right' | 'below' | 'bottom';

export interface LayoutRect {
  visible: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  position: RegionPosition;
  scale: number;
}

export interface GameLayout {
  viewportWidth: number;
  breakpoint: LayoutBreakpoint;
  cellSize: number;
  contentWidth: number;
  contentHeight: number;
  overflowX: boolean;
  overlapping: boolean;
  playfield: LayoutRect;
  hud: LayoutRect;
  controls: LayoutRect;
  nextQueue: LayoutRect;
  holdBox: LayoutRect;
  scorePanel: LayoutRect;
}

const APP_PAD = 8;
const PANEL_PAD = 10;
const GAP = 8;
const HUD_H = 44;
const CONTROLS_H = 72;
const SIDE_W_DESKTOP = 132;
const PLAYFIELD_PAD = 8;
const PLAYFIELD_GAPS = 9;

export function breakpointForWidth(width: number): LayoutBreakpoint {
  if (width <= 400) return 'narrow';
  if (width <= 720) return 'mobile';
  if (width >= 1280) return 'wide';
  return 'desktop';
}

export function cellSizeForWidth(width: number): number {
  const inner = width - APP_PAD * 2 - PANEL_PAD * 2 - PLAYFIELD_PAD - PLAYFIELD_GAPS;
  const stacked = Math.max(10, Math.floor(inner / 10));
  if (width <= 400) return Math.min(24, stacked);
  if (width <= 720) return Math.min(22, Math.max(14, stacked));
  if (width >= 1280) return 28;
  return 26;
}

export function computeGameLayout(viewportWidth: number): GameLayout {
  const width = Math.max(1, Math.floor(viewportWidth));
  const breakpoint = breakpointForWidth(width);
  const cellSize = cellSizeForWidth(width);
  const playfieldW = cellSize * 10 + PLAYFIELD_GAPS + PLAYFIELD_PAD;
  const playfieldH = cellSize * 20 + 19 + PLAYFIELD_PAD;
  const scale = cellSize / 26;

  let hud: LayoutRect;
  let scorePanel: LayoutRect;
  let holdBox: LayoutRect;
  let playfield: LayoutRect;
  let nextQueue: LayoutRect;
  let controls: LayoutRect;

  if (breakpoint === 'narrow') {
    const innerW = width - APP_PAD * 2;
    const panelW = Math.min(innerW, playfieldW + PANEL_PAD * 2);
    hud = rect(APP_PAD, APP_PAD, innerW, HUD_H, 'top', scale);
    scorePanel = { ...hud, position: 'top' };
    playfield = rect(
      APP_PAD,
      APP_PAD + HUD_H + GAP,
      panelW,
      playfieldH + PANEL_PAD * 2,
      'center',
      scale,
    );
    const belowY = playfield.y + playfield.h + GAP;
    const half = Math.floor((innerW - GAP) / 2);
    holdBox = rect(APP_PAD, belowY, half, 88, 'below', scale);
    nextQueue = rect(APP_PAD + half + GAP, belowY, innerW - half - GAP, 88, 'below', scale);
    controls = rect(APP_PAD, belowY + 88 + GAP, innerW, CONTROLS_H, 'bottom', scale);
  } else if (breakpoint === 'mobile') {
    const innerW = width - APP_PAD * 2;
    hud = rect(APP_PAD, APP_PAD, innerW, HUD_H, 'top', scale);
    scorePanel = { ...hud, position: 'top' };
    const fieldX = APP_PAD + Math.max(0, Math.floor((innerW - playfieldW) / 2));
    playfield = rect(fieldX, APP_PAD + HUD_H + GAP, playfieldW, playfieldH, 'center', scale);
    const belowY = playfield.y + playfield.h + GAP;
    const half = Math.floor((innerW - GAP) / 2);
    holdBox = rect(APP_PAD, belowY, half, 96, 'below', scale);
    nextQueue = rect(APP_PAD + half + GAP, belowY, innerW - half - GAP, 96, 'below', scale);
    controls = rect(APP_PAD, belowY + 96 + GAP, innerW, CONTROLS_H, 'bottom', scale);
  } else {
    const innerW = width - APP_PAD * 2;
    const sideW = breakpoint === 'wide' ? 160 : SIDE_W_DESKTOP;
    hud = rect(APP_PAD, APP_PAD, innerW, HUD_H, 'top', scale);
    scorePanel = { ...hud, position: 'top' };
    const rowY = APP_PAD + HUD_H + GAP;
    holdBox = rect(APP_PAD, rowY, sideW, playfieldH, 'left', scale);
    playfield = rect(APP_PAD + sideW + GAP, rowY, playfieldW, playfieldH, 'center', scale);
    nextQueue = rect(playfield.x + playfield.w + GAP, rowY, sideW, playfieldH, 'right', scale);
    controls = rect(playfield.x, rowY + playfieldH + GAP, playfieldW, 0, 'bottom', 0);
    controls.visible = false;
    controls.h = 0;
  }

  const regions = [hud, holdBox, playfield, nextQueue, controls].filter(
    (region) => region.visible && region.h > 0,
  );
  const contentWidth =
    Math.max(
      ...[hud, scorePanel, holdBox, playfield, nextQueue, controls].map(
        (region) => region.x + region.w,
      ),
      0,
    ) + APP_PAD;
  const contentHeight =
    Math.max(
      ...[hud, scorePanel, holdBox, playfield, nextQueue, controls].map(
        (region) => region.y + region.h,
      ),
      0,
    ) + APP_PAD;

  return {
    viewportWidth: width,
    breakpoint,
    cellSize,
    contentWidth,
    contentHeight,
    overflowX: contentWidth > width,
    overlapping: hasOverlap(regions),
    playfield,
    hud,
    controls:
      breakpoint === 'desktop' || breakpoint === 'wide'
        ? { ...controls, visible: true, h: Math.max(controls.h, 1), position: 'right' }
        : controls,
    nextQueue,
    holdBox,
    scorePanel,
  };
}

export function layoutCssVars(layout: GameLayout): Record<string, string> {
  return {
    '--cell-size': `${layout.cellSize}px`,
    '--layout-bp': layout.breakpoint,
  };
}

function rect(
  x: number,
  y: number,
  w: number,
  h: number,
  position: RegionPosition,
  scale: number,
): LayoutRect {
  return { visible: true, x, y, w, h, position, scale };
}

function hasOverlap(regions: LayoutRect[]): boolean {
  for (let i = 0; i < regions.length; i += 1) {
    for (let j = i + 1; j < regions.length; j += 1) {
      if (intersects(regions[i]!, regions[j]!)) return true;
    }
  }
  return false;
}

function intersects(a: LayoutRect, b: LayoutRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
