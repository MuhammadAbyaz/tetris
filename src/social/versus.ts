import {
  createGame,
  Game,
  type GameOptions,
  type LockResult,
  type LockedCell,
} from '../game/engine';

export type VersusKind = 'local' | 'online';

export function garbageLinesForClears(linesCleared: number): number {
  if (linesCleared >= 4) return 4;
  if (linesCleared === 3) return 2;
  if (linesCleared === 2) return 1;
  return 0;
}

export function garbageLinesForCombo(combo: number): number {
  if (combo < 1) return 0;
  return combo;
}

export function garbageLinesForAttack(linesCleared: number, combo = 0): number {
  if (linesCleared <= 0) return 0;
  return garbageLinesForClears(linesCleared) + garbageLinesForCombo(combo);
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
  playerOptions?: GameOptions[];
  playerCount?: number;
  holeColumn?: number;
}

export class VersusSession {
  readonly id: string;
  readonly kind: VersusKind;
  readonly players: Game[];
  readonly sentGarbage: number[];
  readonly eliminated: boolean[];
  winnerIndex: number | null = null;
  private readonly holeColumn?: number;

  constructor(kind: VersusKind, options: VersusOptions = {}) {
    this.id = options.id ?? `versus-${kind}-${Math.random().toString(36).slice(2, 10)}`;
    this.kind = kind;
    this.holeColumn = options.holeColumn;
    const count = Math.max(2, options.playerCount ?? options.playerOptions?.length ?? 2);
    this.players = Array.from({ length: count }, (_, index) =>
      createGame(playerOptionsAt(index, options)),
    );
    this.sentGarbage = Array.from({ length: count }, () => 0);
    this.eliminated = Array.from({ length: count }, () => false);
    this.players.forEach((game, index) => {
      game.onLock((result) => {
        this.applyGarbage(index, result);
        this.refreshEliminations();
      });
    });
  }

  get player1(): Game {
    return this.players[0]!;
  }

  get player2(): Game {
    return this.players[1]!;
  }

  get isFinished(): boolean {
    return this.winnerIndex !== null;
  }

  get aliveCount(): number {
    return this.eliminated.filter((out) => !out).length;
  }

  player(index: number): Game {
    const game = this.players[index];
    if (!game) throw new Error(`No versus player at index ${index}`);
    return game;
  }

  isEliminated(index: number): boolean {
    return this.eliminated[index] === true;
  }

  snapshot(index: number): (LockedCell | null)[][] {
    return this.player(index).board.map((row) => [...row]);
  }

  update(dtMs: number): void {
    if (this.isFinished) return;
    for (let index = 0; index < this.players.length; index += 1) {
      if (!this.eliminated[index]) this.players[index]!.update(dtMs);
    }
    this.refreshEliminations();
  }

  togglePause(): void {
    const shouldPause = this.players.some(
      (game, index) => !this.eliminated[index] && !game.isPaused(),
    );
    for (let index = 0; index < this.players.length; index += 1) {
      if (this.eliminated[index]) continue;
      if (shouldPause) this.players[index]!.pause();
      else this.players[index]!.resume();
    }
  }

  private applyGarbage(from: number, result: LockResult): void {
    const lines = garbageLinesForAttack(result.linesCleared, result.combo);
    if (lines <= 0) return;
    this.sentGarbage[from] = (this.sentGarbage[from] ?? 0) + lines;
    for (let index = 0; index < this.players.length; index += 1) {
      if (index === from || this.eliminated[index]) continue;
      this.players[index]!.injectGarbage(lines, this.holeColumn);
    }
  }

  refreshEliminations(): void {
    if (this.isFinished) return;
    for (let index = 0; index < this.players.length; index += 1) {
      const reason = this.players[index]!.getGameOverReason();
      if (
        this.players[index]!.isOver() &&
        (reason === 'top-out' || reason === 'block-out') &&
        !this.eliminated[index]
      ) {
        this.eliminated[index] = true;
      }
    }
    const alive: number[] = [];
    for (let index = 0; index < this.players.length; index += 1) {
      if (!this.eliminated[index]) alive.push(index);
    }
    if (alive.length === 1) {
      this.winnerIndex = alive[0]!;
      this.players[this.winnerIndex]!.pause();
    }
  }
}

export function createVersusSession(kind: VersusKind, options: VersusOptions = {}): VersusSession {
  return new VersusSession(kind, options);
}

function playerOptionsAt(index: number, options: VersusOptions): GameOptions {
  if (options.playerOptions?.[index]) return { mode: 'versus', ...options.playerOptions[index] };
  if (index === 0 && options.player1) return { mode: 'versus', ...options.player1 };
  if (index === 1 && options.player2) return { mode: 'versus', ...options.player2 };
  return { mode: 'versus' };
}
