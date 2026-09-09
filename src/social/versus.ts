import { createGame, Game, type GameOptions, type LockedCell } from '../game/engine';

export type VersusKind = 'local' | 'online';

export function garbageLinesForClears(linesCleared: number): number {
  if (linesCleared >= 4) return 4;
  if (linesCleared === 3) return 2;
  if (linesCleared === 2) return 1;
  return 0;
}

export function countGarbageRows(game: Game): number {
  let rows = 0;
  for (const row of game.board) {
    if (row.some((cell) => cell === 'G')) rows += 1;
  }
  return rows;
}

export interface VersusOptions {
  id?: string;
  player1?: GameOptions;
  player2?: GameOptions;
  holeColumn?: number;
}

export class VersusSession {
  readonly id: string;
  readonly kind: VersusKind;
  readonly player1: Game;
  readonly player2: Game;
  readonly sentGarbage = [0, 0];
  private readonly holeColumn?: number;

  constructor(kind: VersusKind, options: VersusOptions = {}) {
    this.id = options.id ?? `versus-${kind}-${Math.random().toString(36).slice(2, 10)}`;
    this.kind = kind;
    this.holeColumn = options.holeColumn;
    this.player1 = createGame(options.player1);
    this.player2 = createGame(options.player2);
    this.player1.onLock((result) => this.applyGarbage(0, result.linesCleared));
    this.player2.onLock((result) => this.applyGarbage(1, result.linesCleared));
  }

  player(index: 0 | 1): Game {
    return index === 0 ? this.player1 : this.player2;
  }

  snapshot(index: 0 | 1): (LockedCell | null)[][] {
    return this.player(index).board.map((row) => [...row]);
  }

  private applyGarbage(from: 0 | 1, linesCleared: number): void {
    const lines = garbageLinesForClears(linesCleared);
    if (lines <= 0) return;
    this.sentGarbage[from] += lines;
    const opponent = from === 0 ? this.player2 : this.player1;
    opponent.injectGarbage(lines, this.holeColumn);
  }
}

export function createVersusSession(kind: VersusKind, options: VersusOptions = {}): VersusSession {
  return new VersusSession(kind, options);
}
