import './style.css';
import {
  createGame,
  GARBAGE_COLOR,
  getRotationCells,
  PIECE_COLORS,
  VISIBLE_COLS,
  VISIBLE_ROWS,
  type Cell,
  type Game,
  type LockedCell,
  type PieceType,
} from './game/engine';
import {
  ACHIEVEMENTS,
  createAchievementTracker,
  createAccountClient,
  createBackend,
  createVersusSession,
  dailyDateKey,
  getGlobalLeaderboard,
  joinSpectator,
  requestOnlineMatch,
  startDailyChallenge,
  submitScore,
  VersusSession,
  type CloudSave,
} from './social';

const backend = createBackend();
const account = createAccountClient(backend);
const achievements = createAchievementTracker();

const marathon = createMarathon();
achievements.attach(marathon);

type View =
  | 'menu'
  | 'marathon'
  | 'daily'
  | 'versus'
  | 'online'
  | 'spectate'
  | 'leaderboard'
  | 'account'
  | 'achievements';

const params = new URLSearchParams(window.location.search);
const scene = params.get('scene');

const appRoot = document.querySelector<HTMLDivElement>('#app');
if (!appRoot) {
  throw new Error('Missing #app root');
}
const app = appRoot;

let currentView: View = resolveInitialView(scene);
let dailyGame: Game | null = null;
let versus: VersusSession | null = null;
let online: VersusSession | null = null;
let spectatorMatch: VersusSession | null = null;
let controlTarget: Game | null = marathon;
let toast = '';
let paintView: (() => void) | null = null;

if (scene === 'play' || scene === 'hold') {
  const type = marathon.active?.type ?? 'T';
  marathon.setActive(type, 3, 10, 0);
  if (scene === 'hold') {
    marathon.holdPiece();
    const nextType = marathon.active?.type ?? 'I';
    marathon.setActive(nextType, 4, 8, 0);
  }
}

seedDemoData();
render();
startLoop();

function createMarathon(): Game {
  return createGame({
    nextQueueSize: 5,
    dasMs: 167,
    arrMs: 33,
    gravityMs: 800,
    softDropMs: 40,
  });
}

function resolveInitialView(value: string | null): View {
  const views: View[] = [
    'menu',
    'marathon',
    'daily',
    'versus',
    'online',
    'spectate',
    'leaderboard',
    'account',
    'achievements',
  ];
  if (value === 'play' || value === 'hold') return 'marathon';
  if (value && views.includes(value as View)) return value as View;
  return 'menu';
}

function seedDemoData(): void {
  try {
    backend.register('demo', 'demo');
  } catch {
    /* already present */
  }
  if (backend.getLeaderboard('marathon').length === 0) {
    submitScore(backend, { playerId: 'demo', displayName: 'Demo', mode: 'marathon', score: 2400 });
    submitScore(backend, { playerId: 'cpu', displayName: 'CPU', mode: 'marathon', score: 1800 });
  }
}

function render(): void {
  app.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <strong>Tetris</strong>
        <nav class="nav">
          ${navButton('menu', 'Hub')}
          ${navButton('marathon', 'Marathon')}
          ${navButton('daily', 'Daily')}
          ${navButton('versus', 'Versus')}
          ${navButton('online', 'Online')}
          ${navButton('spectate', 'Spectate')}
          ${navButton('leaderboard', 'Ranks')}
          ${navButton('account', 'Account')}
          ${navButton('achievements', 'Trophies')}
        </nav>
      </header>
      ${toast ? `<div class="toast" data-testid="achievement-toast">${escapeHtml(toast)}</div>` : ''}
      <main class="view" data-testid="view-${currentView}">${renderView()}</main>
    </div>
  `;

  bindChrome();
  bindView();
}

function navButton(view: View, label: string): string {
  return `<button type="button" data-nav="${view}" class="${currentView === view ? 'is-active' : ''}">${label}</button>`;
}

function renderView(): string {
  switch (currentView) {
    case 'menu':
      return `
        <section class="hub" data-testid="social-hub">
          <h1>Online & social</h1>
          <p class="lede">Matchmaking, cloud save, daily seeds, spectating, ranks, and achievements.</p>
          <div class="hub-grid">
            ${hubCard('online', 'Online Versus', 'Queue for an online match that uses local garbage-line rules.')}
            ${hubCard('daily', 'Daily challenge', 'Every player gets the same seeded piece sequence for the date.')}
            ${hubCard('spectate', 'Spectate', 'Watch a live board without controlling pieces.')}
            ${hubCard('leaderboard', 'Global ranks', 'Submitted scores persist on the backend leaderboard.')}
            ${hubCard('account', 'Cloud save', 'Sign in on another device to restore settings and progress.')}
            ${hubCard('achievements', 'Achievements', 'Unlock and show feats such as your first Tetris.')}
          </div>
        </section>`;
    case 'marathon':
      return soloShell('Marathon', marathon, 'marathon');
    case 'daily':
      dailyGame ??= startDailyChallenge(dailyDateKey(new Date()));
      controlTarget = dailyGame;
      return `${soloShell(`Daily ${dailyDateKey(new Date())}`, dailyGame, 'daily')}
        <p class="banner" data-testid="daily-seed">Seeded sequence for ${dailyDateKey(new Date())}</p>`;
    case 'versus':
      versus ??= createVersusSession('local', { holeColumn: 4 });
      controlTarget = versus.player1;
      return dualShell('Local Versus', versus, false);
    case 'online':
      if (!online) {
        requestOnlineMatch(backend, account.userId ?? 'local-player');
        online = requestOnlineMatch(backend, 'cpu-opponent').session;
      }
      if (online) controlTarget = online.player1;
      return online
        ? dualShell('Online Versus', online, false)
        : `<p class="banner">Waiting for an opponent…</p>`;
    case 'spectate':
      if (!spectatorMatch) {
        if (!online) {
          requestOnlineMatch(backend, 'alice');
          online = requestOnlineMatch(backend, 'bob').session;
        }
        spectatorMatch = online;
        if (spectatorMatch) joinSpectator(backend, spectatorMatch, 'local-viewer');
      }
      controlTarget = null;
      return spectatorMatch
        ? dualShell('Spectator', spectatorMatch, true)
        : `<p class="banner">No live match to spectate.</p>`;
    case 'leaderboard':
      return renderLeaderboard();
    case 'account':
      return renderAccount();
    case 'achievements':
      return renderAchievements();
  }
}

function hubCard(view: View, title: string, copy: string): string {
  return `<button type="button" class="hub-card" data-nav="${view}">
    <h2>${title}</h2>
    <p>${copy}</p>
  </button>`;
}

function soloShell(title: string, game: Game, testId: string): string {
  return `
    <div class="shell" data-testid="${testId}-shell">
      <aside class="panel hold-panel">
        <h2>Hold</h2>
        <div class="preview-box" data-testid="hold-box"></div>
        <div class="score-box" data-testid="score">Score ${game.score}</div>
      </aside>
      <section class="board-wrap">
        <h1>${title}</h1>
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
    </div>`;
}

function dualShell(title: string, _match: VersusSession, spectating: boolean): string {
  return `
    <section class="versus-wrap" data-testid="${spectating ? 'spectator-view' : 'versus-view'}">
      <h1>${title}${spectating ? ' · view only' : ''}</h1>
      <div class="versus-grid">
        <div class="board-wrap">
          <h2>Player 1</h2>
          <div class="playfield playfield-sm" data-board="0" style="--cols:${VISIBLE_COLS}"></div>
        </div>
        <div class="board-wrap">
          <h2>Player 2</h2>
          <div class="playfield playfield-sm" data-board="1" style="--cols:${VISIBLE_COLS}"></div>
        </div>
      </div>
      <p class="help">${spectating ? 'Spectators cannot move pieces.' : 'You control Player 1. Garbage uses the same line-send table as local Versus.'}</p>
    </section>`;
}

function renderLeaderboard(): string {
  const rows = getGlobalLeaderboard(backend, 'marathon');
  return `
    <section class="panel wide" data-testid="leaderboard">
      <h1>Global leaderboard · marathon</h1>
      <table>
        <thead><tr><th>#</th><th>Player</th><th>Score</th></tr></thead>
        <tbody>
          ${rows
            .map(
              (row, index) =>
                `<tr><td>${index + 1}</td><td>${escapeHtml(row.displayName)}</td><td>${row.score}</td></tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </section>`;
}

function renderAccount(): string {
  const signedIn = Boolean(account.token);
  const save = signedIn ? account.loadCloud() : null;
  return `
    <section class="panel wide" data-testid="account-panel">
      <h1>Account & cloud save</h1>
      <form class="settings account-form" data-testid="account-form">
        <label>Username <input id="username-input" type="text" value="demo" /></label>
        <label>Password <input id="password-input" type="password" value="demo" /></label>
        <div class="actions">
          <button type="button" data-action="register">Create account</button>
          <button type="button" data-action="login">Sign in</button>
        </div>
      </form>
      <p data-testid="account-status">${signedIn ? `Signed in · high score ${save?.progress.highScore ?? 0}` : 'Signed out'}</p>
    </section>`;
}

function renderAchievements(): string {
  return `
    <section class="panel wide" data-testid="achievements-panel">
      <h1>Achievements</h1>
      <ul class="trophy-list">
        ${Object.values(ACHIEVEMENTS)
          .map((item) => {
            const unlocked = achievements.unlocked.get(item.id);
            return `<li data-testid="achievement-${item.id}" data-unlocked="${Boolean(unlocked)}">
              <strong>${item.title}</strong>
              <span>${item.description}</span>
              <em>${unlocked ? 'Unlocked & shown' : 'Locked'}</em>
            </li>`;
          })
          .join('')}
      </ul>
    </section>`;
}

function bindChrome(): void {
  app.querySelectorAll<HTMLButtonElement>('[data-nav]').forEach((button) => {
    button.addEventListener('click', () => {
      currentView = button.dataset.nav as View;
      if (currentView === 'marathon') controlTarget = marathon;
      if (currentView === 'daily') {
        dailyGame ??= startDailyChallenge(dailyDateKey(new Date()));
        controlTarget = dailyGame;
      }
      render();
    });
  });
}

function bindView(): void {
  if (currentView === 'marathon' || currentView === 'daily') {
    const game = currentView === 'daily' ? dailyGame! : marathon;
    mountSolo(game);
  }
  if ((currentView === 'versus' && versus) || (currentView === 'online' && online)) {
    const match = currentView === 'versus' ? versus! : online!;
    mountDual(match);
  }
  if (currentView === 'spectate' && spectatorMatch) {
    mountDual(spectatorMatch);
  }
  if (currentView === 'account') {
    app.querySelector('[data-action="register"]')?.addEventListener('click', () => {
      const { username, password } = readAccountFields();
      try {
        account.registerAndSignIn(username, password);
        persistCurrentProgress();
        render();
      } catch (error) {
        toast = error instanceof Error ? error.message : 'Could not register';
        render();
      }
    });
    app.querySelector('[data-action="login"]')?.addEventListener('click', () => {
      const { username, password } = readAccountFields();
      try {
        account.login(username, password);
        applyCloudSave(account.loadCloud());
        render();
      } catch (error) {
        toast = error instanceof Error ? error.message : 'Could not sign in';
        render();
      }
    });
  }
}

function readAccountFields(): { username: string; password: string } {
  const username = app.querySelector<HTMLInputElement>('#username-input')?.value ?? '';
  const password = app.querySelector<HTMLInputElement>('#password-input')?.value ?? '';
  return { username, password };
}

function persistCurrentProgress(): void {
  if (!account.token) return;
  const save: CloudSave = {
    settings: { dasMs: marathon.dasMs, arrMs: marathon.arrMs },
    progress: {
      highScore: marathon.score,
      gamesPlayed: 1,
      unlockedAchievementIds: [...achievements.unlocked.keys()],
    },
  };
  account.saveCloud(save);
}

function applyCloudSave(save: CloudSave): void {
  marathon.setDasArr(save.settings);
}

function mountSolo(game: Game): void {
  const playfield = app.querySelector<HTMLDivElement>('[data-testid="playfield"]');
  const holdBox = app.querySelector<HTMLDivElement>('[data-testid="hold-box"]');
  const nextQueue = app.querySelector<HTMLDivElement>('[data-testid="next-queue"]');
  const scoreBox = app.querySelector<HTMLDivElement>('[data-testid="score"]');
  if (!playfield || !holdBox || !nextQueue || !scoreBox) return;
  const cells = fillPlayfield(playfield);
  const dasInput = app.querySelector<HTMLInputElement>('#das-input');
  const arrInput = app.querySelector<HTMLInputElement>('#arr-input');
  const paint = () => {
    paintPlayfield(game, cells);
    paintSidebars(game, holdBox, nextQueue, scoreBox);
  };
  dasInput?.addEventListener('change', () => {
    const das = Number(dasInput.value);
    const arr = Number(arrInput?.value);
    if (Number.isFinite(das) && Number.isFinite(arr)) {
      game.setDasArr({ dasMs: das, arrMs: arr });
      persistCurrentProgress();
    }
  });
  arrInput?.addEventListener('change', () => dasInput?.dispatchEvent(new Event('change')));
  paintView = paint;
  paint();
}

function mountDual(match: VersusSession): void {
  const boards = [0, 1].map((index) => {
    const el = app.querySelector<HTMLDivElement>(`[data-board="${index}"]`)!;
    return { game: match.player(index as 0 | 1), cells: fillPlayfield(el) };
  });
  const paint = () => {
    for (const board of boards) paintPlayfield(board.game, board.cells);
  };
  paintView = paint;
  paint();
}

function fillPlayfield(playfield: HTMLDivElement): HTMLDivElement[] {
  playfield.replaceChildren();
  const cells: HTMLDivElement[] = [];
  for (let i = 0; i < VISIBLE_ROWS * VISIBLE_COLS; i += 1) {
    const cell = document.createElement('div');
    cell.className = 'cell cell-empty';
    playfield.appendChild(cell);
    cells.push(cell);
  }
  return cells;
}

function paintPlayfield(game: Game, playfieldCells: HTMLDivElement[]): void {
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
        color = cellColor(locked);
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

function cellColor(locked: LockedCell): string {
  return locked === 'G' ? GARBAGE_COLOR : PIECE_COLORS[locked];
}

function paintSidebars(
  game: Game,
  holdBox: HTMLDivElement,
  nextQueue: HTMLDivElement,
  scoreBox: HTMLDivElement,
): void {
  const hold = game.getHoldPreview();
  holdBox.dataset.empty = String(hold.piece === null);
  holdBox.replaceChildren(miniGrid(hold.cells, hold.color, hold.piece === null));
  nextQueue.replaceChildren(
    ...game.getNextQueue().map((type: PieceType) => {
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

function indexCells(cells: Cell[]): Set<string> {
  return new Set(cells.map((cell) => `${cell.x},${cell.y}`));
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.repeat || !controlTarget) return;
  const target = event.target as HTMLElement | null;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
  const game = controlTarget;

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
  maybeUnlock();
}

function onKeyUp(event: KeyboardEvent): void {
  if (!controlTarget) return;
  if (event.key === 'ArrowLeft') controlTarget.releaseLeft();
  if (event.key === 'ArrowRight') controlTarget.releaseRight();
  if (event.key === 'ArrowDown') controlTarget.releaseSoftDrop();
}

function maybeUnlock(): void {
  const latest = achievements.shownToPlayer.at(-1);
  if (latest && toast !== latest.title) {
    toast = `Achievement unlocked: ${latest.title}`;
    persistCurrentProgress();
    if (account.token && marathon.isOver()) {
      submitScore(backend, {
        playerId: account.userId ?? 'local',
        displayName: 'You',
        mode: currentView === 'daily' ? 'daily' : 'marathon',
        score: marathon.score,
      });
    }
    render();
  }
}

function startLoop(): void {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  let last = performance.now();
  const tick = (now: number) => {
    const dt = now - last;
    last = now;
    marathon.update(dt);
    dailyGame?.update(dt);
    versus?.player1.update(dt);
    versus?.player2.update(dt);
    online?.player1.update(dt);
    online?.player2.update(dt);
    paintView?.();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
}

declare global {
  interface Window {
    tetrisGame: Game;
  }
}
window.tetrisGame = marathon;
