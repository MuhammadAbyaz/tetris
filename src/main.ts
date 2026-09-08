import './style.css';
import {
  createGame,
  getRotationCells,
  PIECE_COLORS,
  VISIBLE_COLS,
  VISIBLE_ROWS,
  type Cell,
  type Game,
  type PieceType,
} from './game/engine';

const game = createGame({
  nextQueueSize: 5,
  dasMs: 167,
  arrMs: 33,
  gravityMs: 800,
  softDropMs: 40,
});

const scene = new URLSearchParams(window.location.search).get('scene');
if (scene === 'play' || scene === 'hold') {
  const type = game.active?.type ?? 'T';
  game.setActive(type, 3, 10, 0);
  if (scene === 'hold') {
    game.holdPiece();
    const nextType = game.active?.type ?? 'I';
    game.setActive(nextType, 4, 8, 0);
  }
}

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('Missing #app root');
}

app.innerHTML = `
  <div class="shell">
    <aside class="panel hold-panel">
      <h2>Hold</h2>
      <div class="preview-box" data-testid="hold-box"></div>
      <div class="score-box" data-testid="score">Score 0</div>
    </aside>
    <section class="board-wrap">
      <h1>Tetris</h1>
      <div class="playfield" data-testid="playfield" style="--cols:${VISIBLE_COLS}"></div>
    </section>
    <aside class="panel next-panel">
      <h2>Next</h2>
      <div class="next-queue" data-testid="next-queue"></div>
      <form class="settings" data-testid="das-arr-settings">
        <label>DAS (ms)
          <input id="das-input" type="number" min="0" step="10" value="${game.dasMs}" />
        </label>
        <label>ARR (ms)
          <input id="arr-input" type="number" min="0" step="1" value="${game.arrMs}" />
        </label>
      </form>
      <p class="help">← → move · ↓ soft · Space hard · Z/X rotate · A 180 · C hold</p>
    </aside>
  </div>
`;

const playfield = app.querySelector<HTMLDivElement>('[data-testid="playfield"]')!;
const holdBox = app.querySelector<HTMLDivElement>('[data-testid="hold-box"]')!;
const nextQueue = app.querySelector<HTMLDivElement>('[data-testid="next-queue"]')!;
const scoreBox = app.querySelector<HTMLDivElement>('[data-testid="score"]')!;
const dasInput = app.querySelector<HTMLInputElement>('#das-input')!;
const arrInput = app.querySelector<HTMLInputElement>('#arr-input')!;

const playfieldCells: HTMLDivElement[] = [];
for (let i = 0; i < VISIBLE_ROWS * VISIBLE_COLS; i += 1) {
  const cell = document.createElement('div');
  cell.className = 'cell cell-empty';
  playfield.appendChild(cell);
  playfieldCells.push(cell);
}

function miniGrid(cells: Cell[], color: string | null, empty: boolean): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.className = `mini-grid${empty ? ' is-empty' : ''}`;
  let maxX = 3;
  let maxY = 3;
  for (const cell of cells) {
    maxX = Math.max(maxX, cell.x);
    maxY = Math.max(maxY, cell.y);
  }
  wrap.style.setProperty('--mini-cols', String(maxX + 1));
  const occupied = new Set(cells.map((cell) => `${cell.x},${cell.y}`));
  for (let y = maxY; y >= 0; y -= 1) {
    for (let x = 0; x <= maxX; x += 1) {
      const tile = document.createElement('span');
      tile.className = 'mini-cell';
      const filled = occupied.has(`${x},${y}`);
      tile.dataset.filled = String(filled);
      if (filled && color) tile.style.background = color;
      wrap.appendChild(tile);
    }
  }
  return wrap;
}

function paintPlayfield(): void {
  const visible = game.getVisiblePlayfield();
  const active = indexCells(game.getActiveCells());
  const ghost = indexCells(game.getGhostPreview().cells);

  for (let row = 0; row < VISIBLE_ROWS; row += 1) {
    const y = VISIBLE_ROWS - 1 - row;
    for (let x = 0; x < VISIBLE_COLS; x += 1) {
      const el = playfieldCells[row * VISIBLE_COLS + x]!;
      const locked = visible[row]![x];
      const falling = active.has(`${x},${y}`);
      const isGhost = ghost.has(`${x},${y}`);
      let kind = 'empty';
      let color = '';
      if (locked) {
        kind = 'locked';
        color = PIECE_COLORS[locked];
      } else if (falling && game.active) {
        kind = 'active';
        color = PIECE_COLORS[game.active.type];
      } else if (isGhost && game.active) {
        kind = 'ghost';
        color = PIECE_COLORS[game.active.type];
      }
      el.className = `cell cell-${kind}`;
      el.dataset.filled = String(kind !== 'empty');
      el.dataset.kind = kind;
      if (color) el.style.setProperty('--cell', color);
      else el.style.removeProperty('--cell');
    }
  }
}

function indexCells(cells: Cell[]): Set<string> {
  return new Set(cells.map((cell) => `${cell.x},${cell.y}`));
}

function paintSidebars(): void {
  const hold = game.getHoldPreview();
  holdBox.dataset.empty = String(hold.piece === null);
  holdBox.replaceChildren(miniGrid(hold.cells, hold.color, hold.piece === null));

  const next = game.getNextQueue();
  nextQueue.replaceChildren(
    ...next.map((type: PieceType) => {
      const slot = document.createElement('div');
      slot.className = 'preview-slot';
      slot.dataset.piece = type;
      slot.dataset.testid = 'next-piece';
      slot.appendChild(miniGrid(getRotationCells(type, 0), PIECE_COLORS[type], false));
      return slot;
    }),
  );
  scoreBox.textContent = `Score ${game.score}`;
}

function applyTiming(): void {
  const das = Number(dasInput.value);
  const arr = Number(arrInput.value);
  if (Number.isFinite(das) && Number.isFinite(arr)) {
    game.setDasArr({ dasMs: das, arrMs: arr });
  }
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.repeat) return;
  const target = event.target as HTMLElement | null;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault();
      game.pressLeft();
      break;
    case 'ArrowRight':
      event.preventDefault();
      game.pressRight();
      break;
    case 'ArrowDown':
      event.preventDefault();
      game.pressSoftDrop();
      break;
    case ' ':
      event.preventDefault();
      game.hardDrop();
      break;
    case 'ArrowUp':
    case 'x':
    case 'X':
      event.preventDefault();
      game.rotateCw();
      break;
    case 'z':
    case 'Z':
      game.rotateCcw();
      break;
    case 'a':
    case 'A':
      game.rotate180();
      break;
    case 'c':
    case 'C':
    case 'Shift':
      game.holdPiece();
      break;
    default:
      return;
  }
  paint();
}

function onKeyUp(event: KeyboardEvent): void {
  if (event.key === 'ArrowLeft') game.releaseLeft();
  if (event.key === 'ArrowRight') game.releaseRight();
  if (event.key === 'ArrowDown') game.releaseSoftDrop();
}

function paint(): void {
  paintPlayfield();
  paintSidebars();
}

dasInput.addEventListener('change', applyTiming);
arrInput.addEventListener('change', applyTiming);
window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);

let last = performance.now();
function loop(now: number): void {
  game.update(now - last);
  last = now;
  paint();
  requestAnimationFrame(loop);
}

paint();
requestAnimationFrame(loop);

declare global {
  interface Window {
    tetrisGame: Game;
  }
}
window.tetrisGame = game;
