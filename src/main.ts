import './style.css';
import {
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
import { createModeGame, MODE_TITLES, type PlayMode } from './game/modes';
import { formatTimerStat, renderGameplayShell } from './ui/gameplay';
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

type SoloMode = Extract<PlayMode, 'marathon' | 'sprint' | 'ultra' | 'zen'>;
type View =
  | 'menu'
  | SoloMode
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

const soloGames: Record<SoloMode, Game> = {
  marathon: createModeGame('marathon'),
  sprint: createModeGame('sprint'),
  ultra: createModeGame('ultra'),
  zen: createModeGame('zen'),
};
let marathon = soloGames.marathon;
achievements.attach(marathon);

let currentView: View = resolveInitialView(scene);
let dailyGame: Game | null = null;
let versus: VersusSession | null = null;
let online: VersusSession | null = null;
let spectatorMatch: VersusSession | null = null;
let controlTarget: Game | null = marathon;
let toast = '';
let paintView: (() => void) | null = null;

if (scene === 'play' || scene === 'hold' || scene === 'pause' || scene === 'gameover') {
  const type = marathon.active?.type ?? 'T';
  marathon.setActive(type, 3, 10, 0);
  if (scene === 'hold') {
    marathon.holdPiece();
    const nextType = marathon.active?.type ?? 'I';
    marathon.setActive(nextType, 4, 8, 0);
  }
  if (scene === 'pause') {
    marathon.pause();
  }
  if (scene === 'gameover') {
    for (let x = 0; x < VISIBLE_COLS - 1; x += 1) {
      marathon.occupy(x, 0, 'J');
    }
    marathon.setActive('I', VISIBLE_COLS - 3, 8, 1);
    marathon.update(75400);
    marathon.hardDrop();
    for (let y = 18; y < 24; y += 1) {
      for (let x = 0; x < VISIBLE_COLS; x += 1) {
        if (x !== 9) marathon.occupy(x, y, 'I');
      }
    }
    marathon.setActive('T', 4, 4, 0);
    marathon.hardDrop();
  }
}

seedDemoData();
render();
startLoop();

function isSoloMode(view: View): view is SoloMode {
  return view === 'marathon' || view === 'sprint' || view === 'ultra' || view === 'zen';
}

function resolveInitialView(value: string | null): View {
  const views: View[] = [
    'menu',
    'marathon',
    'sprint',
    'ultra',
    'zen',
    'daily',
    'versus',
    'online',
    'spectate',
    'leaderboard',
    'account',
    'achievements',
  ];
  if (value === 'play' || value === 'hold' || value === 'pause' || value === 'gameover') {
    return 'marathon';
  }
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
          ${navButton('sprint', 'Sprint')}
          ${navButton('ultra', 'Ultra')}
          ${navButton('zen', 'Zen')}
          ${navButton('versus', 'Versus')}
          ${navButton('daily', 'Daily')}
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
          <h1>Play Tetris</h1>
          <p class="lede">Marathon, Sprint, Ultra, Zen practice, and local Versus with garbage lines.</p>
          <div class="hub-grid">
            ${hubCard('marathon', 'Marathon', 'Endless play. Speed rises with level until a standard game over.')}
            ${hubCard('sprint', 'Sprint 40', 'Clear 40 lines as fast as you can. Elapsed time stays on screen.')}
            ${hubCard('ultra', 'Ultra', 'Score as much as you can before the countdown hits zero.')}
            ${hubCard('zen', 'Zen / Practice', 'No game over. Block-outs and top-outs keep the stack going.')}
            ${hubCard('versus', 'Local Versus', 'Two or more boards. Attacks send garbage. Last player standing wins.')}
            ${hubCard('online', 'Online Versus', 'Queue for an online match that uses local garbage-line rules.')}
            ${hubCard('daily', 'Daily challenge', 'Every player gets the same seeded piece sequence for the date.')}
            ${hubCard('spectate', 'Spectate', 'Watch a live board without controlling pieces.')}
            ${hubCard('leaderboard', 'Global ranks', 'Submitted scores persist on the backend leaderboard.')}
            ${hubCard('account', 'Cloud save', 'Sign in on another device to restore settings and progress.')}
            ${hubCard('achievements', 'Achievements', 'Unlock and show feats such as your first Tetris.')}
          </div>
        </section>`;
    case 'marathon':
    case 'sprint':
    case 'ultra':
    case 'zen':
      return soloShell(MODE_TITLES[currentView], soloGames[currentView], currentView);
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
  return renderGameplayShell({ game, title, testId }).html;
}

function dualShell(title: string, match: VersusSession, spectating: boolean): string {
  const boards = match.players
    .map(
      (_, index) => `
        <div class="board-wrap${match.isEliminated(index) ? ' is-eliminated' : ''}${match.winnerIndex === index ? ' is-winner' : ''}">
          <h2>Player ${index + 1}${match.isEliminated(index) ? ' · Eliminated' : ''}${match.winnerIndex === index ? ' · Winner' : ''}</h2>
          <div class="playfield playfield-sm" data-board="${index}" style="--cols:${VISIBLE_COLS}"></div>
        </div>`,
    )
    .join('');
  const winner =
    match.winnerIndex !== null
      ? `<p class="banner" data-testid="versus-winner">Player ${match.winnerIndex + 1} wins</p>`
      : '';
  return `
    <section class="versus-wrap" data-testid="${spectating ? 'spectator-view' : 'versus-view'}">
      <h1>${title}${spectating ? ' · view only' : ''}</h1>
      ${winner}
      <div class="versus-grid">${boards}</div>
      <p class="help">${spectating ? 'Spectators cannot move pieces.' : 'P1: arrows · Space hard · Z/X rotate · C hold. P2: J/L move · K soft · I/U rotate · Enter hard · H hold. Attacks send garbage. Last player standing wins.'}</p>
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
      if (isSoloMode(currentView)) controlTarget = soloGames[currentView];
      if (currentView === 'daily') {
        dailyGame ??= startDailyChallenge(dailyDateKey(new Date()));
        controlTarget = dailyGame;
      }
      if (currentView === 'versus' && versus) controlTarget = versus.player1;
      if (currentView === 'online' && online) controlTarget = online.player1;
      if (currentView === 'spectate') controlTarget = null;
      render();
    });
  });
}

function bindView(): void {
  if (isSoloMode(currentView) || currentView === 'daily') {
    const game = currentView === 'daily' ? dailyGame! : soloGames[currentView];
    mountSolo(game);
    app.querySelector('[data-action="resume"]')?.addEventListener('click', () => {
      game.resume();
      render();
    });
    app.querySelector('[data-action="restart"]')?.addEventListener('click', () => {
      restartSolo();
    });
    app.querySelector('[data-action="menu"]')?.addEventListener('click', () => {
      currentView = 'menu';
      controlTarget = null;
      render();
    });
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

function restartSolo(): void {
  if (currentView === 'daily') {
    dailyGame = startDailyChallenge(dailyDateKey(new Date()));
    controlTarget = dailyGame;
  } else if (isSoloMode(currentView)) {
    soloGames[currentView] = createModeGame(currentView);
    if (currentView === 'marathon') {
      marathon = soloGames.marathon;
      achievements.attach(marathon);
    }
    controlTarget = soloGames[currentView];
    window.tetrisGame = controlTarget;
  }
  render();
}

function mountSolo(game: Game): void {
  const playfield = app.querySelector<HTMLDivElement>('[data-testid="playfield"]');
  const holdBox = app.querySelector<HTMLDivElement>('[data-testid="hold-box"]');
  const nextQueue = app.querySelector<HTMLDivElement>('[data-testid="next-queue"]');
  if (!playfield || !holdBox || !nextQueue) return;
  const cells = fillPlayfield(playfield);
  const dasInput = app.querySelector<HTMLInputElement>('#das-input');
  const arrInput = app.querySelector<HTMLInputElement>('#arr-input');
  const paint = () => {
    if (!game.isPaused() && !game.isOver()) {
      paintPlayfield(game, cells);
    }
    paintSidebars(game, holdBox, nextQueue);
    paintHud(game);
    if (game.isOver() && !app.querySelector('[data-testid="game-over-screen"]')) {
      render();
    }
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
  const boards = [...app.querySelectorAll<HTMLDivElement>('[data-board]')].map((el) => {
    const index = Number(el.dataset.board ?? '0');
    return { game: match.player(index), cells: fillPlayfield(el) };
  });
  const paint = () => {
    for (const board of boards) paintPlayfield(board.game, board.cells);
    if (match.isFinished && !app.querySelector('[data-testid="versus-winner"]')) {
      render();
    }
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

function paintHud(game: Game): void {
  const score = app.querySelector('[data-testid="hud-score"]');
  const level = app.querySelector('[data-testid="hud-level"]');
  const lines = app.querySelector('[data-testid="hud-lines"]');
  const combo = app.querySelector('[data-testid="hud-combo"]');
  const backToBack = app.querySelector('[data-testid="hud-back-to-back"]');
  const timer = app.querySelector('[data-testid="hud-timer"]');
  if (score) score.textContent = `Score ${game.score}`;
  if (level) level.textContent = `Level ${game.level}`;
  if (lines) lines.textContent = `Lines ${game.lines}`;
  if (combo) combo.textContent = `Combo ${game.combo}`;
  if (backToBack) backToBack.textContent = game.backToBackActive ? 'Back-to-back' : 'No streak';
  if (timer) {
    const display = game.getTimerDisplay();
    timer.textContent = formatTimerStat(display.kind, display.ms);
  }
}

function paintSidebars(game: Game, holdBox: HTMLDivElement, nextQueue: HTMLDivElement): void {
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

function versusSecondary(): Game | null {
  if (currentView === 'versus' && versus) return versus.player2;
  if (currentView === 'online' && online) return online.player2;
  return null;
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.repeat) return;
  const target = event.target as HTMLElement | null;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    if (currentView === 'versus' && versus) {
      versus.togglePause();
      render();
      return;
    }
    if (currentView === 'online' && online) {
      online.togglePause();
      render();
      return;
    }
    if (!controlTarget || controlTarget.isOver()) return;
    controlTarget.togglePause();
    render();
    return;
  }

  const p2 = versusSecondary();
  if (p2 && handleVersusP2(event, p2)) {
    maybeUnlock();
    return;
  }

  if (!controlTarget) return;
  const game = controlTarget;
  if (game.isPaused() || game.isOver()) return;

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

function handleVersusP2(event: KeyboardEvent, game: Game): boolean {
  if (game.isPaused() || game.isOver()) return false;
  switch (event.key) {
    case 'j':
    case 'J':
      event.preventDefault();
      game.pressLeft();
      return true;
    case 'l':
    case 'L':
      event.preventDefault();
      game.pressRight();
      return true;
    case 'k':
    case 'K':
      event.preventDefault();
      game.pressSoftDrop();
      return true;
    case 'i':
    case 'I':
      event.preventDefault();
      game.rotateCw();
      return true;
    case 'u':
    case 'U':
      game.rotateCcw();
      return true;
    case 'o':
    case 'O':
      game.rotate180();
      return true;
    case 'Enter':
      event.preventDefault();
      game.hardDrop();
      return true;
    case 'h':
    case 'H':
      game.holdPiece();
      return true;
    default:
      return false;
  }
}

function onKeyUp(event: KeyboardEvent): void {
  if (controlTarget) {
    if (event.key === 'ArrowLeft') controlTarget.releaseLeft();
    if (event.key === 'ArrowRight') controlTarget.releaseRight();
    if (event.key === 'ArrowDown') controlTarget.releaseSoftDrop();
  }
  const p2 = versusSecondary();
  if (!p2) return;
  if (event.key === 'j' || event.key === 'J') p2.releaseLeft();
  if (event.key === 'l' || event.key === 'L') p2.releaseRight();
  if (event.key === 'k' || event.key === 'K') p2.releaseSoftDrop();
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
    soloGames.sprint.update(dt);
    soloGames.ultra.update(dt);
    soloGames.zen.update(dt);
    dailyGame?.update(dt);
    versus?.update(dt);
    online?.update(dt);
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
