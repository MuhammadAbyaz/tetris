import {
  HARD_DROP_POINTS,
  SOFT_DROP_POINTS,
  classifyClear,
  detectTSpin,
  isDifficultClear,
  scoreClear,
  type LastAction,
} from './scoring';

export const VISIBLE_COLS = 10;
export const VISIBLE_ROWS = 20;
export const BUFFER_ROWS = 4;
export const TOTAL_ROWS = VISIBLE_ROWS + BUFFER_ROWS;
export const ROTATION_COUNT = 4;

export const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const;
export type PieceType = (typeof PIECE_TYPES)[number];
export type LockedCell = PieceType | 'G';
export type Rotation = 0 | 1 | 2 | 3;
export type Kick = readonly [number, number];

export interface Cell {
  x: number;
  y: number;
}

export interface ActivePiece {
  type: PieceType;
  x: number;
  y: number;
  rotation: Rotation;
}

export interface RotateResult {
  success: boolean;
  kick: Kick | null;
}

export const PIECE_COLORS: Record<PieceType, string> = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000',
};

export const GARBAGE_COLOR = '#6b7280';
export {
  BACK_TO_BACK_MULTIPLIER,
  COMBO_POINTS_PER_LEVEL,
  HARD_DROP_POINTS,
  LINE_CLEAR_SCORES,
  SOFT_DROP_POINTS,
  T_SPIN_SCORES,
  baseClearScore,
  classifyClear,
  comboBonus,
  detectTSpin,
  isDifficultClear,
  scoreClear,
} from './scoring';
export type { ClearType, LastAction, TSpinKind } from './scoring';

export interface LockResult {
  linesCleared: number;
  isTetris: boolean;
  isTSpin: boolean;
  isMiniTSpin: boolean;
  clearType: import('./scoring').ClearType;
  scoreAwarded: number;
  backToBackAwarded: boolean;
  combo: number;
  lockedType: PieceType;
}

const SHAPES: Record<PieceType, Cell[][]> = {
  I: [
    [
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
    ],
    [
      { x: 2, y: 3 },
      { x: 2, y: 2 },
      { x: 2, y: 1 },
      { x: 2, y: 0 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ],
    [
      { x: 1, y: 3 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
    ],
  ],
  O: [
    [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  ],
  T: [
    [
      { x: 1, y: 2 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 0 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 0 },
    ],
    [
      { x: 1, y: 2 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
    ],
  ],
  S: [
    [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
    [
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 0 },
    ],
    [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ],
    [
      { x: 0, y: 2 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
    ],
  ],
  Z: [
    [
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 2, y: 2 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 0 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ],
    [
      { x: 1, y: 2 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 0, y: 0 },
    ],
  ],
  J: [
    [
      { x: 0, y: 2 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 0 },
    ],
    [
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ],
  ],
  L: [
    [
      { x: 2, y: 2 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 0, y: 0 },
    ],
    [
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
    ],
  ],
};

export const JLSTZ_KICKS: Record<string, Kick[]> = {
  '0>1': [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  '1>0': [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  '1>2': [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  '2>1': [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  '2>3': [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  '3>2': [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  '3>0': [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  '0>3': [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
};

export const I_KICKS: Record<string, Kick[]> = {
  '0>1': [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, -1],
    [1, 2],
  ],
  '1>0': [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, 1],
    [-1, -2],
  ],
  '1>2': [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, 2],
    [2, -1],
  ],
  '2>1': [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, -2],
    [-2, 1],
  ],
  '2>3': [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, 1],
    [-1, -2],
  ],
  '3>2': [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, -1],
    [1, 2],
  ],
  '3>0': [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, -2],
    [-2, 1],
  ],
  '0>3': [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, 2],
    [2, -1],
  ],
};

const O_KICKS: Kick[] = [[0, 0]];
const ONE_EIGHTY_KICKS: Kick[] = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function getRotationCells(type: PieceType, rotation: number): Cell[] {
  return SHAPES[type][((rotation % ROTATION_COUNT) + ROTATION_COUNT) % ROTATION_COUNT].map(
    (cell) => ({
      ...cell,
    }),
  );
}

export function getKickTests(type: PieceType, from: number, to: number): Kick[] {
  if (type === 'O') return O_KICKS;
  if ((from + 2) % ROTATION_COUNT === to) return ONE_EIGHTY_KICKS;
  const table = type === 'I' ? I_KICKS : JLSTZ_KICKS;
  return table[`${from}>${to}`] ?? O_KICKS;
}

export function createSevenBag(rng: () => number = Math.random) {
  const queue: PieceType[] = [];

  function refill(): void {
    const bag: PieceType[] = [...PIECE_TYPES];
    for (let i = bag.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const current = bag[i]!;
      bag[i] = bag[j]!;
      bag[j] = current;
    }
    queue.push(...bag);
  }

  function ensure(count: number): void {
    while (queue.length < count) refill();
  }

  return {
    next(): PieceType {
      ensure(1);
      return queue.shift()!;
    },
    peek(count: number): PieceType[] {
      ensure(count);
      return queue.slice(0, count);
    },
  };
}

export type GameOverReason = 'block-out' | 'top-out' | 'sprint-complete' | 'time-up';
export type PlayMode = 'marathon' | 'sprint' | 'ultra' | 'zen' | 'versus';
export type TimerKind = 'elapsed' | 'countdown';

export const LINES_PER_LEVEL = 10;
export const SPRINT_LINE_TARGET = 40;
export const ULTRA_TIME_LIMIT_MS = 180_000;
export const DEFAULT_BASE_GRAVITY_MS = 800;
export const DEFAULT_MIN_GRAVITY_MS = 20;
export const GRAVITY_CURVE_BASE = 0.8;
export const GRAVITY_CURVE_STEP = 0.007;

export interface GravityCurveOptions {
  baseGravityMs?: number;
  minGravityMs?: number;
}

export function gravityMsForLevel(level: number, options: GravityCurveOptions = {}): number {
  const baseGravityMs = options.baseGravityMs ?? DEFAULT_BASE_GRAVITY_MS;
  const minGravityMs = options.minGravityMs ?? DEFAULT_MIN_GRAVITY_MS;
  const n = Math.max(1, Math.floor(level));
  const factor = Math.max(0.01, GRAVITY_CURVE_BASE - (n - 1) * GRAVITY_CURVE_STEP);
  const computed = baseGravityMs * factor ** (n - 1);
  return Math.max(minGravityMs, computed);
}

export function fallSpeedCellsPerSecond(gravityMs: number): number {
  return 1000 / Math.max(1, gravityMs);
}

export interface GameOptions {
  gravityMs?: number;
  minGravityMs?: number;
  linesPerLevel?: number;
  softDropMs?: number;
  dasMs?: number;
  arrMs?: number;
  nextQueueSize?: number;
  pieceSequence?: PieceType[];
  rng?: () => number;
  mode?: PlayMode;
  lineTarget?: number | null;
  timeLimitMs?: number | null;
  noFail?: boolean;
}

export interface TimerDisplay {
  visible: boolean;
  kind: TimerKind;
  ms: number;
}

type MovePhase = 'idle' | 'das' | 'arr';

interface MoveRepeat {
  dir: -1 | 1;
  elapsed: number;
  phase: MovePhase;
  dasMs: number;
  arrMs: number;
}

export class Game {
  readonly softDropPointsPerCell = SOFT_DROP_POINTS;
  readonly hardDropPointsPerCell = HARD_DROP_POINTS;

  board: (LockedCell | null)[][];
  active: ActivePiece | null = null;
  hold: PieceType | null = null;
  holdAvailable = true;
  score = 0;
  lines = 0;
  combo = 0;
  backToBackActive = false;
  elapsedMs = 0;
  gravityMs: number;
  readonly baseGravityMs: number;
  readonly minGravityMs: number;
  readonly linesPerLevel: number;
  softDropMs: number;
  dasMs: number;
  arrMs: number;
  nextQueueSize: number;
  lastLock: LockResult | null = null;
  readonly mode: PlayMode;
  readonly lineTarget: number | null;
  readonly timeLimitMs: number | null;
  readonly noFail: boolean;

  private nextQueue: PieceType[] = [];
  private sequence: PieceType[];
  private bag: ReturnType<typeof createSevenBag>;
  private rng: () => number;
  private gravityElapsed = 0;
  private softDropElapsed = 0;
  private softDropHeld = false;
  private moveRepeat: MoveRepeat | null = null;
  private gameOver = false;
  private gameOverReason: GameOverReason | null = null;
  private paused = false;
  private lockListeners: Array<(result: LockResult) => void> = [];
  private lastAction: LastAction = 'spawn';
  private lastKick: Kick | null = null;
  private comboStreak = false;

  get level(): number {
    return Math.floor(this.lines / this.linesPerLevel) + 1;
  }

  constructor(options: GameOptions = {}) {
    this.baseGravityMs = options.gravityMs ?? DEFAULT_BASE_GRAVITY_MS;
    this.minGravityMs = options.minGravityMs ?? DEFAULT_MIN_GRAVITY_MS;
    this.linesPerLevel = options.linesPerLevel ?? LINES_PER_LEVEL;
    this.gravityMs = gravityMsForLevel(1, {
      baseGravityMs: this.baseGravityMs,
      minGravityMs: this.minGravityMs,
    });
    this.softDropMs = options.softDropMs ?? 40;
    this.dasMs = options.dasMs ?? 167;
    this.arrMs = options.arrMs ?? 33;
    this.nextQueueSize = Math.min(5, Math.max(3, options.nextQueueSize ?? 5));
    this.mode = options.mode ?? 'marathon';
    this.lineTarget =
      options.lineTarget !== undefined
        ? options.lineTarget
        : this.mode === 'sprint'
          ? SPRINT_LINE_TARGET
          : null;
    this.timeLimitMs =
      options.timeLimitMs !== undefined
        ? options.timeLimitMs
        : this.mode === 'ultra'
          ? ULTRA_TIME_LIMIT_MS
          : null;
    this.noFail = options.noFail ?? this.mode === 'zen';
    this.sequence = [...(options.pieceSequence ?? [])];
    this.rng = options.rng ?? Math.random;
    this.bag = createSevenBag(this.rng);
    this.board = Array.from({ length: TOTAL_ROWS }, () =>
      Array.from({ length: VISIBLE_COLS }, () => null),
    );
    this.fillQueue();
    this.spawn(this.takePiece());
  }

  getNextQueue(): PieceType[] {
    return [...this.nextQueue];
  }

  getHold(): PieceType | null {
    return this.hold;
  }

  getHoldPreview(): { piece: PieceType | null; color: string | null; cells: Cell[] } {
    if (!this.hold) {
      return { piece: null, color: null, cells: [] };
    }
    return {
      piece: this.hold,
      color: PIECE_COLORS[this.hold],
      cells: getRotationCells(this.hold, 0),
    };
  }

  isOver(): boolean {
    return this.gameOver;
  }

  getGameOverReason(): GameOverReason | null {
    return this.gameOverReason;
  }

  get remainingTimeMs(): number {
    if (this.timeLimitMs === null) return 0;
    return Math.max(0, this.timeLimitMs - this.elapsedMs);
  }

  getTimerDisplay(): TimerDisplay {
    if (this.mode === 'ultra' || this.timeLimitMs !== null) {
      return { visible: true, kind: 'countdown', ms: this.remainingTimeMs };
    }
    if (this.mode === 'sprint' || this.lineTarget !== null) {
      return { visible: true, kind: 'elapsed', ms: this.elapsedMs };
    }
    return { visible: false, kind: 'elapsed', ms: this.elapsedMs };
  }

  isPaused(): boolean {
    return this.paused;
  }

  pause(): void {
    if (this.gameOver) return;
    this.paused = true;
    this.moveRepeat = null;
    this.softDropHeld = false;
    this.softDropElapsed = 0;
  }

  resume(): void {
    if (this.gameOver) return;
    this.paused = false;
  }

  togglePause(): void {
    if (this.paused) this.resume();
    else this.pause();
  }

  onLock(listener: (result: LockResult) => void): () => void {
    this.lockListeners.push(listener);
    return () => {
      this.lockListeners = this.lockListeners.filter((fn) => fn !== listener);
    };
  }

  injectGarbage(count: number, holeColumn?: number): void {
    if (count <= 0 || (this.gameOver && !this.noFail)) return;
    const hole =
      holeColumn !== undefined
        ? ((holeColumn % VISIBLE_COLS) + VISIBLE_COLS) % VISIBLE_COLS
        : Math.floor(this.rng() * VISIBLE_COLS);

    for (let i = 0; i < count; i += 1) {
      if (this.board[TOTAL_ROWS - 1]!.some((cell) => cell !== null)) {
        this.endGame(this.bufferHasLockedBlocks() ? 'top-out' : 'block-out');
      }
      for (let y = TOTAL_ROWS - 1; y > 0; y -= 1) {
        this.board[y] = this.board[y - 1]!;
      }
      this.board[0] = Array.from({ length: VISIBLE_COLS }, (_, x) => (x === hole ? null : 'G'));
    }

    if (this.active && !this.canPlace(this.active) && !this.tryMove(0, 1)) {
      this.endGame(this.bufferHasLockedBlocks() ? 'top-out' : 'block-out');
    }
  }

  getVisiblePlayfield(): (LockedCell | null)[][] {
    const visible: (LockedCell | null)[][] = [];
    for (let displayRow = 0; displayRow < VISIBLE_ROWS; displayRow += 1) {
      const y = VISIBLE_ROWS - 1 - displayRow;
      visible.push([...this.board[y]!]);
    }
    return visible;
  }

  getActiveCells(): Cell[] {
    if (!this.active) return [];
    return this.cellsOf(this.active);
  }

  getGhostY(): number | null {
    if (!this.active) return null;
    let y = this.active.y;
    while (this.canPlace({ ...this.active, y: y - 1 })) {
      y -= 1;
    }
    return y;
  }

  getGhostPreview(): { translucent: true; cells: Cell[] } {
    const y = this.getGhostY();
    if (!this.active || y === null) {
      return { translucent: true, cells: [] };
    }
    return {
      translucent: true,
      cells: this.cellsOf({ ...this.active, y }),
    };
  }

  setActive(type: PieceType, x: number, y: number, rotation: number): void {
    this.active = { type, x, y, rotation: wrapRotation(rotation) };
  }

  occupy(x: number, y: number, type: PieceType = 'I'): void {
    if (!this.inBounds(x, y)) return;
    this.board[y]![x] = type;
  }

  boardHasType(type: PieceType): boolean {
    return this.board.some((row) => row.some((cell) => cell === type));
  }

  canPlace(piece: ActivePiece): boolean {
    return this.cellsOf(piece).every((cell) => this.isFree(cell.x, cell.y));
  }

  tryMove(dx: number, dy: number): boolean {
    if (!this.active || this.gameOver || this.paused) return false;
    const next = { ...this.active, x: this.active.x + dx, y: this.active.y + dy };
    if (!this.canPlace(next)) return false;
    this.active = next;
    this.lastAction = 'move';
    this.lastKick = null;
    return true;
  }

  rotateCw(): RotateResult {
    return this.rotateBy(1);
  }

  rotateCcw(): RotateResult {
    return this.rotateBy(-1);
  }

  rotate180(): RotateResult {
    return this.rotateBy(2);
  }

  holdPiece(): boolean {
    if (!this.active || !this.holdAvailable || this.gameOver || this.paused) return false;
    const current = this.active.type;
    if (this.hold === null) {
      this.hold = current;
      this.spawn(this.takePiece());
    } else {
      const swapped = this.hold;
      this.hold = current;
      this.spawn(swapped);
    }
    this.holdAvailable = false;
    this.lastAction = 'spawn';
    this.lastKick = null;
    return true;
  }

  pressLeft(): void {
    if (this.paused || this.gameOver) return;
    this.startRepeat(-1);
  }

  pressRight(): void {
    if (this.paused || this.gameOver) return;
    this.startRepeat(1);
  }

  releaseLeft(): void {
    if (this.moveRepeat?.dir === -1) this.moveRepeat = null;
  }

  releaseRight(): void {
    if (this.moveRepeat?.dir === 1) this.moveRepeat = null;
  }

  pressSoftDrop(): void {
    if (this.paused || this.gameOver) return;
    this.softDropHeld = true;
    this.softDropElapsed = 0;
  }

  releaseSoftDrop(): void {
    this.softDropHeld = false;
    this.softDropElapsed = 0;
  }

  hardDrop(): void {
    if (!this.active || this.gameOver || this.paused) return;
    const startY = this.active.y;
    const landingY = this.getGhostY();
    if (landingY === null) return;
    const distance = startY - landingY;
    this.active = { ...this.active, y: landingY };
    this.score += distance * this.hardDropPointsPerCell;
    if (distance > 0) {
      this.lastAction = this.lastAction === 'rotate' ? 'rotate' : 'drop';
    }
    this.lockActive();
  }

  setDasArr(settings: { dasMs?: number; arrMs?: number }): void {
    if (settings.dasMs !== undefined) this.dasMs = settings.dasMs;
    if (settings.arrMs !== undefined) this.arrMs = settings.arrMs;
  }

  update(dtMs: number): void {
    if (this.gameOver || this.paused) return;
    this.elapsedMs += dtMs;
    if (this.timeLimitMs !== null && this.elapsedMs >= this.timeLimitMs) {
      this.elapsedMs = this.timeLimitMs;
      this.endGame('time-up');
      return;
    }
    this.advanceRepeat(dtMs);

    if (this.softDropHeld) {
      this.softDropElapsed += dtMs;
      while (this.softDropElapsed >= this.softDropMs) {
        this.softDropElapsed -= this.softDropMs;
        if (!this.tryMove(0, -1)) {
          this.lockActive();
          break;
        }
        this.score += this.softDropPointsPerCell;
      }
      return;
    }

    this.gravityElapsed += dtMs;
    while (this.gravityElapsed >= this.gravityMs) {
      this.gravityElapsed -= this.gravityMs;
      if (!this.tryMove(0, -1)) {
        this.lockActive();
        break;
      }
    }
  }

  private startRepeat(dir: -1 | 1): void {
    this.tryMove(dir, 0);
    this.moveRepeat = {
      dir,
      elapsed: 0,
      phase: 'das',
      dasMs: this.dasMs,
      arrMs: this.arrMs,
    };
  }

  private advanceRepeat(dtMs: number): void {
    if (!this.moveRepeat) return;
    this.moveRepeat.elapsed += dtMs;
    if (this.moveRepeat.phase === 'das') {
      if (this.moveRepeat.elapsed >= this.moveRepeat.dasMs) {
        this.moveRepeat.elapsed -= this.moveRepeat.dasMs;
        this.moveRepeat.phase = 'arr';
        this.tryMove(this.moveRepeat.dir, 0);
      } else {
        return;
      }
    }
    if (this.moveRepeat.phase === 'arr') {
      if (this.moveRepeat.arrMs <= 0) {
        while (this.tryMove(this.moveRepeat.dir, 0)) {
          /* sonic ARR */
        }
        this.moveRepeat.elapsed = 0;
        return;
      }
      while (this.moveRepeat.elapsed >= this.moveRepeat.arrMs) {
        this.moveRepeat.elapsed -= this.moveRepeat.arrMs;
        if (!this.tryMove(this.moveRepeat.dir, 0)) break;
      }
    }
  }

  private rotateBy(steps: number): RotateResult {
    if (!this.active || this.gameOver || this.paused) return { success: false, kick: null };
    const from = this.active.rotation;
    const to = wrapRotation(from + steps);
    const tests = getKickTests(this.active.type, from, to);
    for (const kick of tests) {
      const next: ActivePiece = {
        type: this.active.type,
        x: this.active.x + kick[0],
        y: this.active.y + kick[1],
        rotation: to,
      };
      if (this.canPlace(next)) {
        this.active = next;
        this.lastAction = 'rotate';
        this.lastKick = kick;
        return { success: true, kick };
      }
    }
    return { success: false, kick: null };
  }

  private lockActive(): void {
    if (!this.active) return;
    const lockedType = this.active.type;
    const lastLockInBuffer = this.cellsOf(this.active).some((cell) => cell.y >= VISIBLE_ROWS);
    const tSpin = detectTSpin({
      type: this.active.type,
      x: this.active.x,
      y: this.active.y,
      lastAction: this.lastAction,
      lastKick: this.lastKick,
      isOccupied: (x, y) => this.isCornerOccupied(x, y),
    });
    for (const cell of this.cellsOf(this.active)) {
      if (this.inBounds(cell.x, cell.y)) {
        this.board[cell.y]![cell.x] = this.active.type;
      }
    }
    const linesCleared = this.clearFullLines();
    const clearType = classifyClear(linesCleared, tSpin);
    const isTSpin = tSpin !== 'none';
    const isMiniTSpin = tSpin === 'mini';
    const difficult = isDifficultClear(clearType);
    const backToBackAwarded = difficult && this.backToBackActive;

    if (linesCleared > 0) {
      if (this.comboStreak) this.combo += 1;
      else this.combo = 0;
      this.comboStreak = true;
    } else {
      this.combo = 0;
      this.comboStreak = false;
    }

    const awarded = scoreClear({
      clearType,
      level: this.level,
      backToBack: backToBackAwarded,
      combo: this.combo,
    });
    this.score += awarded.total;

    if (linesCleared > 0) {
      this.backToBackActive = difficult;
    }

    this.lines += linesCleared;
    this.applyGravityForLevel();
    this.lastLock = {
      linesCleared,
      isTetris: linesCleared === 4,
      isTSpin,
      isMiniTSpin,
      clearType,
      scoreAwarded: awarded.total,
      backToBackAwarded,
      combo: this.combo,
      lockedType,
    };
    this.holdAvailable = true;
    this.gravityElapsed = 0;
    this.lastAction = 'spawn';
    this.lastKick = null;
    if (this.lineTarget !== null && this.lines >= this.lineTarget) {
      this.endGame('sprint-complete');
      this.active = null;
      for (const listener of this.lockListeners) {
        listener(this.lastLock);
      }
      return;
    }
    this.spawn(this.takePiece(), { lastLockInBuffer });
    for (const listener of this.lockListeners) {
      listener(this.lastLock);
    }
  }

  private clearFullLines(): number {
    const remaining: (LockedCell | null)[][] = [];
    let cleared = 0;
    for (let y = 0; y < TOTAL_ROWS; y += 1) {
      const row = this.board[y]!;
      if (row.every((cell) => cell !== null)) {
        cleared += 1;
      } else {
        remaining.push(row);
      }
    }
    while (remaining.length < TOTAL_ROWS) {
      remaining.push(Array.from({ length: VISIBLE_COLS }, () => null));
    }
    this.board = remaining;
    return cleared;
  }

  private spawn(type: PieceType, context: { lastLockInBuffer?: boolean } = {}): void {
    const piece: ActivePiece = { type, x: 3, y: VISIBLE_ROWS, rotation: 0 };
    if (!this.canPlace(piece) && this.noFail) {
      for (const cell of this.cellsOf(piece)) {
        if (this.inBounds(cell.x, cell.y)) {
          this.board[cell.y]![cell.x] = null;
        }
      }
    }
    if (!this.canPlace(piece)) {
      this.active = piece;
      this.endGame(context.lastLockInBuffer ? 'top-out' : 'block-out');
      return;
    }
    this.active = piece;
  }

  private applyGravityForLevel(): void {
    this.gravityMs = gravityMsForLevel(this.level, {
      baseGravityMs: this.baseGravityMs,
      minGravityMs: this.minGravityMs,
    });
  }

  private endGame(reason: GameOverReason): void {
    if (this.noFail && (reason === 'block-out' || reason === 'top-out')) {
      return;
    }
    this.gameOver = true;
    this.gameOverReason = reason;
  }

  private bufferHasLockedBlocks(): boolean {
    for (let y = VISIBLE_ROWS; y < TOTAL_ROWS; y += 1) {
      if (this.board[y]!.some((cell) => cell !== null)) return true;
    }
    return false;
  }

  private takePiece(): PieceType {
    this.fillQueue();
    const next = this.nextQueue.shift();
    this.fillQueue();
    return next ?? this.bag.next();
  }

  private fillQueue(): void {
    while (this.nextQueue.length < this.nextQueueSize) {
      this.nextQueue.push(this.sequence.length > 0 ? this.sequence.shift()! : this.bag.next());
    }
  }

  private cellsOf(piece: ActivePiece): Cell[] {
    return getRotationCells(piece.type, piece.rotation).map((cell) => ({
      x: piece.x + cell.x,
      y: piece.y + cell.y,
    }));
  }

  private isFree(x: number, y: number): boolean {
    if (x < 0 || x >= VISIBLE_COLS || y < 0 || y >= TOTAL_ROWS) return false;
    return this.board[y]![x] === null;
  }

  private isCornerOccupied(x: number, y: number): boolean {
    if (x < 0 || x >= VISIBLE_COLS || y < 0) return true;
    if (y >= TOTAL_ROWS) return false;
    return this.board[y]![x] !== null;
  }

  private inBounds(x: number, y: number): boolean {
    return x >= 0 && x < VISIBLE_COLS && y >= 0 && y < TOTAL_ROWS;
  }
}

export function createGame(options: GameOptions = {}): Game {
  return new Game(options);
}

function wrapRotation(value: number): Rotation {
  return (((value % ROTATION_COUNT) + ROTATION_COUNT) % ROTATION_COUNT) as Rotation;
}
