export type LastAction = 'spawn' | 'move' | 'rotate' | 'drop';
export type TSpinKind = 'none' | 'mini' | 'full';
export type KickOffset = readonly [number, number];
export type ClearType =
  | 'none'
  | 'single'
  | 'double'
  | 'triple'
  | 'tetris'
  | 't-spin'
  | 't-spin-single'
  | 't-spin-double'
  | 't-spin-triple'
  | 'mini-t-spin'
  | 'mini-t-spin-single';

export const LINE_CLEAR_SCORES = [0, 100, 300, 500, 800] as const;
export const T_SPIN_SCORES = [400, 800, 1200, 1600] as const;
export const MINI_T_SPIN_SCORES = [100, 200] as const;
export const SOFT_DROP_POINTS = 1;
export const HARD_DROP_POINTS = 2;
export const COMBO_POINTS_PER_LEVEL = 50;
export const BACK_TO_BACK_MULTIPLIER = 1.5;

export function classifyClear(linesCleared: number, tSpin: TSpinKind): ClearType {
  if (tSpin === 'full') {
    if (linesCleared <= 0) return 't-spin';
    if (linesCleared === 1) return 't-spin-single';
    if (linesCleared === 2) return 't-spin-double';
    return 't-spin-triple';
  }
  if (tSpin === 'mini') {
    if (linesCleared <= 0) return 'mini-t-spin';
    return 'mini-t-spin-single';
  }
  if (linesCleared <= 0) return 'none';
  if (linesCleared === 1) return 'single';
  if (linesCleared === 2) return 'double';
  if (linesCleared === 3) return 'triple';
  return 'tetris';
}

export function baseClearScore(clearType: ClearType): number {
  switch (clearType) {
    case 'single':
      return LINE_CLEAR_SCORES[1];
    case 'double':
      return LINE_CLEAR_SCORES[2];
    case 'triple':
      return LINE_CLEAR_SCORES[3];
    case 'tetris':
      return LINE_CLEAR_SCORES[4];
    case 't-spin':
      return T_SPIN_SCORES[0];
    case 't-spin-single':
      return T_SPIN_SCORES[1];
    case 't-spin-double':
      return T_SPIN_SCORES[2];
    case 't-spin-triple':
      return T_SPIN_SCORES[3];
    case 'mini-t-spin':
      return MINI_T_SPIN_SCORES[0];
    case 'mini-t-spin-single':
      return MINI_T_SPIN_SCORES[1];
    default:
      return 0;
  }
}

export function isDifficultClear(clearType: ClearType): boolean {
  return (
    clearType === 'tetris' ||
    clearType === 't-spin-single' ||
    clearType === 't-spin-double' ||
    clearType === 't-spin-triple' ||
    clearType === 'mini-t-spin-single'
  );
}

export function comboBonus(combo: number, level: number): number {
  if (combo <= 0) return 0;
  return COMBO_POINTS_PER_LEVEL * combo * Math.max(1, level);
}

export function scoreClear(options: {
  clearType: ClearType;
  level: number;
  backToBack: boolean;
  combo: number;
}): { lineScore: number; backToBackBonus: number; comboScore: number; total: number } {
  const level = Math.max(1, options.level);
  const lineScore = baseClearScore(options.clearType) * level;
  const backToBackBonus =
    options.backToBack && isDifficultClear(options.clearType)
      ? Math.floor(lineScore * (BACK_TO_BACK_MULTIPLIER - 1))
      : 0;
  const comboScore = comboBonus(options.combo, level);
  return {
    lineScore,
    backToBackBonus,
    comboScore,
    total: lineScore + backToBackBonus + comboScore,
  };
}

export function detectTSpin(options: {
  type: string;
  x: number;
  y: number;
  lastAction: LastAction;
  lastKick: KickOffset | null;
  isOccupied: (x: number, y: number) => boolean;
}): TSpinKind {
  if (options.type !== 'T' || options.lastAction !== 'rotate') return 'none';
  const cx = options.x + 1;
  const cy = options.y + 1;
  const corners: Array<readonly [number, number]> = [
    [cx - 1, cy + 1],
    [cx + 1, cy + 1],
    [cx - 1, cy - 1],
    [cx + 1, cy - 1],
  ];
  const filled = corners.filter(([x, y]) => options.isOccupied(x, y)).length;
  if (filled >= 3) return 'full';
  const kicked = Boolean(
    options.lastKick && (options.lastKick[0] !== 0 || options.lastKick[1] !== 0),
  );
  if (filled === 2 && kicked) return 'mini';
  return 'none';
}
