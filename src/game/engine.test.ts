import { describe, expect, it } from 'vitest';
import {
  BUFFER_ROWS,
  createGame,
  createSevenBag,
  getKickTests,
  getRotationCells,
  I_KICKS,
  JLSTZ_KICKS,
  PIECE_COLORS,
  PIECE_TYPES,
  ROTATION_COUNT,
  VISIBLE_COLS,
  VISIBLE_ROWS,
} from './engine';

describe('TETR-1 Standard Tetris playfield with spawn buffer', () => {
  it('TETR-1 shows a grid of 10 columns by 20 visible rows', () => {
    const game = createGame({ gravityMs: 1_000_000 });
    const visible = game.getVisiblePlayfield();

    expect(visible).toHaveLength(VISIBLE_ROWS);
    expect(VISIBLE_ROWS).toBe(20);
    expect(VISIBLE_COLS).toBe(10);
    for (const row of visible) {
      expect(row).toHaveLength(VISIBLE_COLS);
    }
  });
});

describe('TETR-2 Standard Tetris playfield with spawn buffer', () => {
  it('TETR-2 originates within the 2-4 hidden buffer rows without being visible until it enters row 20', () => {
    const game = createGame({
      gravityMs: 1_000_000,
      pieceSequence: ['T'],
    });

    expect(BUFFER_ROWS).toBeGreaterThanOrEqual(2);
    expect(BUFFER_ROWS).toBeLessThanOrEqual(4);

    const cells = game.getActiveCells();
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.every((cell) => cell.y >= VISIBLE_ROWS)).toBe(true);

    const visible = game.getVisiblePlayfield();
    const painted = visible.flat().filter((cell) => cell !== null);
    expect(painted).toHaveLength(0);
  });
});

describe('TETR-3 Standard Tetris playfield with spawn buffer', () => {
  it('TETR-3 any overlapping piece movement is rejected', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['T'] });
    game.setActive('T', 3, 10, 0);
    const startX = game.active!.x;
    game.occupy(6, 11);

    const moved = game.tryMove(1, 0);

    expect(moved).toBe(false);
    expect(game.active!.x).toBe(startX);
    expect(game.canPlace(game.active!)).toBe(true);
  });
});

describe('TETR-4 Seven-piece tetromino set with 7-bag randomizer', () => {
  it('TETR-4 only the I, O, T, S, Z, J, and L shapes appear, each rendered in its distinct color', () => {
    const bag = createSevenBag(() => 0.5);
    const generated = Array.from({ length: 70 }, () => bag.next());

    expect(new Set(generated)).toEqual(new Set(PIECE_TYPES));
    expect(PIECE_TYPES).toEqual(['I', 'O', 'T', 'S', 'Z', 'J', 'L']);
    expect(new Set(Object.values(PIECE_COLORS)).size).toBe(7);
    for (const type of PIECE_TYPES) {
      expect(PIECE_COLORS[type]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe('TETR-5 Seven-piece tetromino set with 7-bag randomizer', () => {
  it('TETR-5 comes from a newly shuffled bag containing exactly one of each of the 7 piece types', () => {
    const bag = createSevenBag(() => 0.25);
    const firstBag = Array.from({ length: 7 }, () => bag.next());
    const secondBag = Array.from({ length: 7 }, () => bag.next());

    expect(new Set(firstBag).size).toBe(7);
    expect(firstBag).toEqual(expect.arrayContaining([...PIECE_TYPES]));
    expect(new Set(secondBag).size).toBe(7);
    expect(secondBag).toEqual(expect.arrayContaining([...PIECE_TYPES]));
  });
});

describe('TETR-6 Seven-piece tetromino set with 7-bag randomizer', () => {
  it('TETR-6 exactly 4 distinct rotation states are available', () => {
    for (const type of PIECE_TYPES) {
      const rotations = [0, 1, 2, 3].map((rotation) =>
        getRotationCells(type, rotation)
          .map((cell) => `${cell.x},${cell.y}`)
          .sort()
          .join('|'),
      );
      expect(rotations).toHaveLength(ROTATION_COUNT);
      expect(ROTATION_COUNT).toBe(4);
      expect(new Set(rotations).size).toBe(type === 'O' ? 1 : 4);
    }
  });
});

describe('TETR-7 Super Rotation System (SRS) with wall kicks', () => {
  it('TETR-7 the SRS wall-kick table is consulted to find a valid offset position before the rotation is rejected', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['T'] });
    game.setActive('T', 4, 10, 0);
    game.occupy(5, 10);

    const before = { x: game.active!.x, y: game.active!.y, rotation: game.active!.rotation };
    const result = game.rotateCw();

    expect(result.success).toBe(true);
    expect(result.kick).not.toEqual([0, 0]);
    expect(game.active!.rotation).toBe((before.rotation + 1) % 4);
    expect(game.canPlace(game.active!)).toBe(true);
  });
});

describe('TETR-8 Super Rotation System (SRS) with wall kicks', () => {
  it('TETR-8 the I-piece-specific kick table is used rather than the J/L/S/T/Z table', () => {
    expect(getKickTests('I', 0, 1)).toEqual(I_KICKS['0>1']);
    expect(getKickTests('T', 0, 1)).toEqual(JLSTZ_KICKS['0>1']);
    expect(getKickTests('I', 0, 1)).not.toEqual(getKickTests('T', 0, 1));

    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['I'] });
    game.setActive('I', 3, 8, 0);
    game.occupy(5, 11);

    const result = game.rotateCw();

    expect(result.success).toBe(true);
    expect(result.kick).toEqual(I_KICKS['0>1'].find((kick) => kick[0] !== 0 || kick[1] !== 0));
    expect(result.kick).not.toEqual(JLSTZ_KICKS['0>1'][1]);
  });
});

describe('TETR-9 Super Rotation System (SRS) with wall kicks', () => {
  it('TETR-9 the piece rotates directly to the opposite orientation if a valid position exists', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['T'] });
    game.setActive('T', 4, 10, 0);

    const result = game.rotate180();

    expect(result.success).toBe(true);
    expect(game.active!.rotation).toBe(2);
    expect(game.active!.x).toBe(4);
    expect(game.active!.y).toBe(10);
  });
});

describe('TETR-10 Core piece movement and drop controls', () => {
  it('TETR-10 the piece shifts one column in that direction if the destination cells are unoccupied', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['T'] });
    game.setActive('T', 4, 10, 0);

    expect(game.tryMove(-1, 0)).toBe(true);
    expect(game.active!.x).toBe(3);
    expect(game.tryMove(1, 0)).toBe(true);
    expect(game.active!.x).toBe(4);
  });
});

describe('TETR-11 Core piece movement and drop controls', () => {
  it('TETR-11 the piece descends faster than normal gravity and a small score bonus accrues per cell descended', () => {
    const game = createGame({
      gravityMs: 1000,
      softDropMs: 50,
      pieceSequence: ['T'],
    });
    game.setActive('T', 4, 12, 0);
    const startY = game.active!.y;
    const startScore = game.score;

    game.update(50);
    expect(game.active!.y).toBe(startY);

    game.pressSoftDrop();
    game.update(50);

    expect(game.active!.y).toBe(startY - 1);
    expect(game.score).toBe(startScore + game.softDropPointsPerCell);
    expect(game.softDropPointsPerCell).toBeGreaterThan(0);
    expect(game.softDropMs).toBeLessThan(game.gravityMs);
  });
});

describe('TETR-12 Core piece movement and drop controls', () => {
  it('TETR-12 the piece instantly locks at the lowest valid position and a larger score bonus is awarded for the distance dropped', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['T', 'I'] });
    game.setActive('T', 4, 12, 0);
    const startType = game.active!.type;
    const distance = game.getGhostY() === null ? 0 : game.active!.y - game.getGhostY()!;

    game.hardDrop();

    expect(game.score).toBe(distance * game.hardDropPointsPerCell);
    expect(game.hardDropPointsPerCell).toBeGreaterThan(game.softDropPointsPerCell);
    expect(game.boardHasType(startType)).toBe(true);
    expect(game.active!.type).toBe('I');
    expect(game.active!.y).toBeGreaterThanOrEqual(VISIBLE_ROWS);
  });
});

describe('TETR-13 Hold piece mechanic', () => {
  it('TETR-13 the active piece moves to the hold slot and is replaced by the previously held piece or the next queue piece', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['T', 'I', 'O'] });
    expect(game.active!.type).toBe('T');
    expect(game.getHold()).toBeNull();

    expect(game.holdPiece()).toBe(true);
    expect(game.getHold()).toBe('T');
    expect(game.active!.type).toBe('I');

    game.hardDrop();
    expect(game.holdAvailable).toBe(true);
    expect(game.holdPiece()).toBe(true);
    expect(game.getHold()).toBe('O');
    expect(game.active!.type).toBe('T');
  });
});

describe('TETR-14 Hold piece mechanic', () => {
  it('TETR-14 the action is ignored until the current piece locks', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['T', 'I', 'O'] });
    expect(game.holdPiece()).toBe(true);
    const held = game.getHold();
    const active = game.active!.type;

    expect(game.holdPiece()).toBe(false);
    expect(game.getHold()).toBe(held);
    expect(game.active!.type).toBe(active);
    expect(game.holdAvailable).toBe(false);
  });
});

describe('TETR-15 Hold piece mechanic', () => {
  it('TETR-15 hold becomes available again for that new piece', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['T', 'I', 'O'] });
    game.holdPiece();
    expect(game.holdAvailable).toBe(false);

    game.hardDrop();

    expect(game.holdAvailable).toBe(true);
    expect(game.holdPiece()).toBe(true);
  });
});

describe('TETR-16 Tunable DAS/ARR auto-repeat movement', () => {
  it('TETR-16 the piece begins repeating movement in that direction', () => {
    const game = createGame({
      gravityMs: 1_000_000,
      dasMs: 200,
      arrMs: 50,
      pieceSequence: ['T'],
    });
    game.setActive('T', 5, 10, 0);
    game.pressLeft();
    expect(game.active!.x).toBe(4);

    game.update(200);
    expect(game.active!.x).toBe(3);
  });
});

describe('TETR-17 Tunable DAS/ARR auto-repeat movement', () => {
  it('TETR-17 the piece moves an additional column at that cadence until the key is released', () => {
    const game = createGame({
      gravityMs: 1_000_000,
      dasMs: 200,
      arrMs: 40,
      pieceSequence: ['T'],
    });
    game.setActive('T', 6, 10, 0);
    game.pressLeft();
    game.update(200);
    const afterDas = game.active!.x;

    game.update(40);
    expect(game.active!.x).toBe(afterDas - 1);
    game.update(40);
    expect(game.active!.x).toBe(afterDas - 2);

    game.releaseLeft();
    game.update(40);
    expect(game.active!.x).toBe(afterDas - 2);
  });
});

describe('TETR-18 Tunable DAS/ARR auto-repeat movement', () => {
  it('TETR-18 the new timing values are applied', () => {
    const game = createGame({
      gravityMs: 1_000_000,
      dasMs: 300,
      arrMs: 80,
      pieceSequence: ['T'],
    });
    game.setDasArr({ dasMs: 100, arrMs: 20 });
    game.setActive('T', 6, 10, 0);

    game.pressLeft();
    expect(game.active!.x).toBe(5);
    game.update(99);
    expect(game.active!.x).toBe(5);
    game.update(1);
    expect(game.active!.x).toBe(4);
    game.update(20);
    expect(game.active!.x).toBe(3);
  });
});

describe('TETR-19 Piece preview: next queue, hold box, and ghost piece', () => {
  it('TETR-19 at least 3 and up to 5 upcoming pieces are visible in spawn order', () => {
    const game = createGame({ gravityMs: 1_000_000, nextQueueSize: 5 });
    const next = game.getNextQueue();

    expect(next.length).toBeGreaterThanOrEqual(3);
    expect(next.length).toBeLessThanOrEqual(5);
    expect(next.every((type) => PIECE_TYPES.includes(type))).toBe(true);

    const first = next[0];
    game.hardDrop();
    expect(game.active!.type).toBe(first);
  });
});

describe('TETR-20 Piece preview: next queue, hold box, and ghost piece', () => {
  it('TETR-20 it displays that piece shape and color; when no piece is held, the hold box is empty', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['Z'] });
    const empty = game.getHoldPreview();
    expect(empty.piece).toBeNull();
    expect(empty.color).toBeNull();
    expect(empty.cells).toEqual([]);

    game.holdPiece();
    const held = game.getHoldPreview();
    expect(held.piece).toBe('Z');
    expect(held.color).toBe(PIECE_COLORS.Z);
    expect(held.cells.length).toBe(4);
  });
});

describe('TETR-21 Piece preview: next queue, hold box, and ghost piece', () => {
  it('TETR-21 a translucent ghost piece is rendered at the lowest valid landing position for that column and rotation', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['T'] });
    game.setActive('T', 4, 14, 0);

    const ghost = game.getGhostPreview();
    expect(ghost.translucent).toBe(true);
    expect(ghost.cells.length).toBe(4);

    const activeXs = new Set(game.getActiveCells().map((cell) => cell.x));
    expect(ghost.cells.every((cell) => activeXs.has(cell.x))).toBe(true);
    expect(Math.min(...ghost.cells.map((cell) => cell.y))).toBeLessThan(
      Math.min(...game.getActiveCells().map((cell) => cell.y)),
    );

    game.setActive('T', 4, 14, 1);
    const rotatedGhost = game.getGhostPreview();
    expect(rotatedGhost.cells).not.toEqual(ghost.cells);
    expect(game.canPlace({ ...game.active!, y: game.getGhostY()! })).toBe(true);
    expect(game.canPlace({ ...game.active!, y: game.getGhostY()! - 1 })).toBe(false);
  });
});

describe('createEmptyBoard compatibility', () => {
  it('keeps the visible 10x20 empty grid helper', async () => {
    const { createEmptyBoard, DEFAULT_CONFIG } = await import('./logic');
    const board = createEmptyBoard();
    expect(board).toHaveLength(DEFAULT_CONFIG.boardHeight);
    expect(board[0]).toHaveLength(DEFAULT_CONFIG.boardWidth);
  });
});
