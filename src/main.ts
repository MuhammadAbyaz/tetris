import './style.css';
import {
  GARBAGE_COLOR,
  getRotationCells,
  VISIBLE_COLS,
  VISIBLE_ROWS,
  type Cell,
  type Game,
  type PieceType,
} from './game/engine';
import { createModeGame, MODE_TITLES, type PlayMode } from './game/modes';
import { formatTimerStat, renderGameplayShell } from './ui/gameplay';
import { renderPrimaryNav } from './ui/chrome';
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
import {
  attachGameAudio,
  actionForKey,
  actionForTouchControl,
  applyAppearance,
  applyTouch,
  browserStore,
  computeGameLayout,
  createAudioController,
  createEffectsController,
  createPlayerSession,
  createReplayRecorder,
  dispatchAction,
  handleKeyUp,
  hasLastReplay,
  layoutCssVars,
  loadLastReplay,
  playReplay,
  releaseTouch,
  renderLocalLeaderboard,
  renderSettingsMenu,
  resolveAppearance,
  saveLastReplay,
  submitLocalRecord,
  type EffectsController,
  type GameAction,
  type ReplayPlayback,
  type ReplayRecorder,
  type TouchControl,
} from './player';

const backend = createBackend();
const account = createAccountClient(backend);
const achievements = createAchievementTracker();
const store = browserStore();
const audio = createAudioController();
const player = createPlayerSession({ store, audio });
let capturingBinding: GameAction | null = null;
const wiredGames = new WeakSet<Game>();
const replayGames = new WeakSet<Game>();
const recorders = new WeakMap<Game, ReplayRecorder>();
const effectControllers = new WeakMap<Game, EffectsController>();
let activeReplay: ReplayPlayback | null = null;
let leaderboardFilter = 'all';

function handlingOptions() {
  return { dasMs: player.settings.dasMs, arrMs: player.settings.arrMs };
}

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
  | 'achievements'
  | 'settings';

const params = new URLSearchParams(window.location.search);
const scene = params.get('scene');

const appRoot = document.querySelector<HTMLDivElement>('#app');
if (!appRoot) {
  throw new Error('Missing #app root');
}
const app = appRoot;

const soloGames: Record<SoloMode, Game> = {
  marathon: createModeGame('marathon', handlingOptions()),
  sprint: createModeGame('sprint', handlingOptions()),
  ultra: createModeGame('ultra', handlingOptions()),
  zen: createModeGame('zen', handlingOptions()),
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

listenToGame(marathon);
listenToGame(soloGames.sprint);
listenToGame(soloGames.ultra);
listenToGame(soloGames.zen);

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
    'settings',
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
  const appearance = applyDocumentAppearance();
  syncGameplayMusic();
  app.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <strong>Tetris</strong>
        ${renderPrimaryNav(currentView)}
      </header>
      ${toast ? `<div class="toast" data-testid="achievement-toast">${escapeHtml(toast)}</div>` : ''}
      <main class="view" data-testid="view-${currentView}">${renderView(appearance)}</main>
    </div>
  `;

  bindChrome();
  bindView();
  applyResponsiveLayout();
}

function renderView(appearance = resolveAppearance(player.settings)): string {
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
            ${hubCard('leaderboard', 'Ranks', 'Local per-mode records plus global backend ranks.')}
            ${hubCard('account', 'Cloud save', 'Sign in on another device to restore settings and progress.')}
            ${hubCard('achievements', 'Achievements', 'Unlock and show feats such as your first Tetris.')}
            ${hubCard('settings', 'Settings', 'Music, themes, accessibility, keys, and DAS/ARR.')}
            ${
              hasLastReplay(store)
                ? `<button type="button" class="hub-card" data-action="replay-last" data-testid="hub-replay-last" aria-label="Replay last game">
              <h2>Replay last game</h2>
              <p>Play back the recorded input log from your previous session.</p>
            </button>`
                : ''
            }
          </div>
        </section>`;
    case 'marathon':
    case 'sprint':
    case 'ultra':
    case 'zen':
      return soloShell(MODE_TITLES[currentView], soloGames[currentView], currentView, appearance);
    case 'daily':
      dailyGame ??= startDailyChallenge(dailyDateKey(new Date()));
      listenToGame(dailyGame);
      controlTarget = dailyGame;
      return `${soloShell(`Daily ${dailyDateKey(new Date())}`, dailyGame, 'daily', appearance)}
        <p class="banner" data-testid="daily-seed">Seeded sequence for ${dailyDateKey(new Date())}</p>`;
    case 'versus':
      versus ??= createVersusSession('local', { holeColumn: 4 });
      versus.players.forEach(listenToGame);
      controlTarget = versus.player1;
      return dualShell('Local Versus', versus, false);
    case 'online':
      if (!online) {
        requestOnlineMatch(backend, account.userId ?? 'local-player');
        online = requestOnlineMatch(backend, 'cpu-opponent').session;
      }
      if (online) {
        online.players.forEach(listenToGame);
        controlTarget = online.player1;
      }
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
    case 'settings':
      if (!player.menuOpen) player.openSettings();
      return renderSettingsMenu(player.draft);
  }
}

function hubCard(view: View, title: string, copy: string): string {
  return `<button type="button" class="hub-card" data-nav="${view}" aria-label="${title}">
    <h2>${title}</h2>
    <p>${copy}</p>
  </button>`;
}

function soloShell(
  title: string,
  game: Game,
  testId: string,
  appearance = resolveAppearance(player.settings),
): string {
  return renderGameplayShell({
    game,
    title,
    testId,
    highScore: player.highScore,
    muted: player.audio.muted,
    effects: effectsFor(game),
    replayAvailable: hasLastReplay(store),
    appearanceTheme: appearance.themeId,
    boardBackground: appearance.boardBackground,
  }).html;
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
    </section>
    ${renderLocalLeaderboard(store, leaderboardFilter)}`;
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
      const next = button.dataset.nav as View;
      if (currentView === 'settings' && next !== 'settings' && player.menuOpen) {
        player.closeSettings();
        applySettingsToGames();
        capturingBinding = null;
      }
      currentView = next;
      if (currentView === 'settings' && !player.menuOpen) player.openSettings();
      if (isSoloMode(currentView)) controlTarget = soloGames[currentView];
      if (currentView === 'daily') {
        dailyGame ??= startDailyChallenge(dailyDateKey(new Date()));
        controlTarget = dailyGame;
      }
      if (currentView === 'versus' && versus) controlTarget = versus.player1;
      if (currentView === 'online' && online) controlTarget = online.player1;
      if (currentView === 'spectate') controlTarget = null;
      if (
        currentView !== 'marathon' &&
        currentView !== 'sprint' &&
        currentView !== 'ultra' &&
        currentView !== 'zen' &&
        currentView !== 'daily'
      ) {
        activeReplay = null;
      }
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
      activeReplay = null;
      render();
    });
    app.querySelector('[data-action="replay-last"]')?.addEventListener('click', () => {
      startLastReplay();
    });
    app.querySelector('[data-action="toggle-mute"]')?.addEventListener('click', () => {
      applyPlayerDraft({ muted: !player.audio.muted });
      render();
    });
    app.querySelector('[data-action="open-settings"]')?.addEventListener('click', () => {
      if (controlTarget && !controlTarget.isOver()) controlTarget.pause();
      currentView = 'settings';
      render();
    });
    bindTouchControls();
  }
  if (currentView === 'settings') {
    bindSettingsMenu();
  }
  if ((currentView === 'versus' && versus) || (currentView === 'online' && online)) {
    const match = currentView === 'versus' ? versus! : online!;
    mountDual(match);
  }
  if (currentView === 'spectate' && spectatorMatch) {
    mountDual(spectatorMatch);
  }
  if (currentView === 'menu') {
    app.querySelector('[data-action="replay-last"]')?.addEventListener('click', () => {
      startLastReplay();
    });
  }
  if (currentView === 'leaderboard') {
    app
      .querySelector<HTMLSelectElement>('[data-testid="leaderboard-mode-filter"]')
      ?.addEventListener('change', (event) => {
        leaderboardFilter = (event.target as HTMLSelectElement).value;
        render();
      });
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
    settings: { dasMs: player.settings.dasMs, arrMs: player.settings.arrMs },
    progress: {
      highScore: Math.max(player.highScore, marathon.score),
      gamesPlayed: 1,
      unlockedAchievementIds: [...achievements.unlocked.keys()],
    },
  };
  account.saveCloud(save);
}

function applyCloudSave(save: CloudSave): void {
  applyPlayerDraft({ dasMs: save.settings.dasMs, arrMs: save.settings.arrMs });
}

function restartSolo(): void {
  activeReplay = null;
  if (currentView === 'daily') {
    dailyGame = startDailyChallenge(dailyDateKey(new Date()));
    controlTarget = dailyGame;
    listenToGame(dailyGame);
  } else if (isSoloMode(currentView)) {
    soloGames[currentView] = createModeGame(currentView, handlingOptions());
    if (currentView === 'marathon') {
      marathon = soloGames.marathon;
      achievements.attach(marathon);
    }
    controlTarget = soloGames[currentView];
    listenToGame(controlTarget);
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
      applyPlayerDraft({ dasMs: das, arrMs: arr });
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
  const clearing = new Set(game.getClearingRows());
  const colors = resolveAppearance(player.settings).pieceColors;
  const enhanced = Boolean(effectControllers.get(game)?.lineClear?.playing);

  for (let row = 0; row < VISIBLE_ROWS; row += 1) {
    const y = VISIBLE_ROWS - 1 - row;
    for (let x = 0; x < VISIBLE_COLS; x += 1) {
      const el = playfieldCells[row * VISIBLE_COLS + x]!;
      const locked = visible[row]![x];
      const falling = active.has(`${x},${y}`);
      const isGhost = ghost.has(`${x},${y}`);
      const isClearing = clearing.has(y) && locked !== null;
      let kind = 'empty';
      let color = '';
      if (isClearing) {
        kind = 'clearing';
        color = locked === 'G' ? GARBAGE_COLOR : colors[locked];
      } else if (locked) {
        kind = 'locked';
        color = locked === 'G' ? GARBAGE_COLOR : colors[locked];
      } else if (falling && game.active) {
        kind = 'active';
        color = colors[game.active.type];
      } else if (isGhost && game.active) {
        kind = 'ghost';
        color = colors[game.active.type];
      }
      el.className = `cell cell-${kind}${isClearing && enhanced ? ' cell-clearing-enhanced' : ''}`;
      el.dataset.filled = String(kind !== 'empty');
      el.dataset.kind = kind;
      if (color) el.style.setProperty('--cell', color);
      else el.style.removeProperty('--cell');
    }
  }
}

function paintHud(game: Game): void {
  const score = app.querySelector('[data-testid="hud-score"]');
  const level = app.querySelector('[data-testid="hud-level"]');
  const lines = app.querySelector('[data-testid="hud-lines"]');
  const combo = app.querySelector('[data-testid="hud-combo"]');
  const backToBack = app.querySelector('[data-testid="hud-back-to-back"]');
  const timer = app.querySelector('[data-testid="hud-timer"]');
  const highScore = app.querySelector('[data-testid="hud-high-score"]');
  if (score) score.textContent = `Score ${game.score}`;
  if (highScore) highScore.textContent = `Best ${player.highScore}`;
  if (level) level.textContent = `Level ${game.level}`;
  if (lines) lines.textContent = `Lines ${game.lines}`;
  if (combo) combo.textContent = `Combo ${game.combo}`;
  if (backToBack) backToBack.textContent = game.backToBackActive ? 'Back-to-back' : 'No streak';
  if (timer) {
    const display = game.getTimerDisplay();
    timer.textContent = formatTimerStat(display.kind, display.ms);
  }
  const stack = app.querySelector('.playfield-stack');
  if (stack) {
    stack
      .querySelectorAll('[data-testid="line-clear-effect"], [data-testid="level-up-effect"]')
      .forEach((el) => el.remove());
    const overlays = effectControllers.get(game)?.renderOverlays() ?? '';
    if (overlays) stack.insertAdjacentHTML('beforeend', overlays);
  }
}

function paintSidebars(game: Game, holdBox: HTMLDivElement, nextQueue: HTMLDivElement): void {
  const colors = resolveAppearance(player.settings).pieceColors;
  const hold = game.getHoldPreview();
  holdBox.dataset.empty = String(hold.piece === null);
  holdBox.replaceChildren(
    miniGrid(hold.cells, hold.piece ? colors[hold.piece] : hold.color, hold.piece === null),
  );
  nextQueue.replaceChildren(
    ...game.getNextQueue().map((type: PieceType) => {
      const slot = document.createElement('div');
      slot.className = 'preview-slot';
      slot.dataset.piece = type;
      slot.dataset.testid = 'next-piece';
      slot.appendChild(miniGrid(getRotationCells(type, 0), colors[type], false));
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

  if (capturingBinding) {
    event.preventDefault();
    player.captureBinding(capturingBinding, event.key);
    capturingBinding = null;
    render();
    return;
  }

  if (currentView === 'settings') return;
  if (activeReplay) return;

  const p2 = versusSecondary();
  if (p2 && handleVersusP2(event, p2)) {
    maybeUnlock();
    return;
  }

  if (!controlTarget) return;
  const action = actionForKey(player.settings.bindings, event.key);
  if (!action) return;
  event.preventDefault();
  if (action === 'pause') {
    if (currentView === 'versus' && versus) versus.togglePause();
    else if (currentView === 'online' && online) online.togglePause();
    else controlTarget.togglePause();
    render();
    return;
  }
  if (controlTarget.isPaused() || controlTarget.isOver()) return;
  dispatchAction(controlTarget, action);
  recorders.get(controlTarget)?.record('action', action);
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
  if (controlTarget && !activeReplay) {
    const action = actionForKey(player.settings.bindings, event.key);
    if (action) recorders.get(controlTarget)?.record('release', action);
    handleKeyUp(player.settings.bindings, controlTarget, event.key);
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
  window.addEventListener('resize', applyResponsiveLayout);
  applyResponsiveLayout();
  let last = performance.now();
  const tick = (now: number) => {
    const dt = now - last;
    last = now;
    const replayGame = activeReplay?.game ?? null;
    if (activeReplay) activeReplay.advance(dt);
    if (marathon !== replayGame) marathon.update(dt);
    if (soloGames.sprint !== replayGame) soloGames.sprint.update(dt);
    if (soloGames.ultra !== replayGame) soloGames.ultra.update(dt);
    if (soloGames.zen !== replayGame) soloGames.zen.update(dt);
    if (dailyGame && dailyGame !== replayGame) dailyGame.update(dt);
    versus?.update(dt);
    online?.update(dt);
    for (const game of [marathon, soloGames.sprint, soloGames.ultra, soloGames.zen, dailyGame]) {
      if (game) effectControllers.get(game)?.tick(dt);
    }
    paintView?.();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function listenToGame(game: Game): void {
  if (wiredGames.has(game)) return;
  wiredGames.add(game);
  attachGameAudio(game, audio);
  const effects = createEffectsController();
  effects.attach(game);
  effectControllers.set(game, effects);
  recorders.set(game, createReplayRecorder(game));
  game.onCue((cue) => {
    if (cue === 'gameOver') {
      player.persistScore(game.score);
      persistCurrentProgress();
      if (replayGames.has(game)) return;
      const recorder = recorders.get(game);
      if (recorder) saveLastReplay(store, recorder.finalize());
      submitLocalRecord(store, {
        mode: game.mode,
        score: game.score,
        lines: game.lines,
        level: game.level,
        elapsedMs: game.elapsedMs,
      });
    }
  });
}

function applyPlayerDraft(partial: Parameters<typeof player.changeDraft>[0]): void {
  const wasOpen = player.menuOpen;
  if (!wasOpen) player.openSettings();
  player.changeDraft(partial);
  player.closeSettings();
  applySettingsToGames();
  if (wasOpen) player.openSettings();
}

function applySettingsToGames(): void {
  const handling = handlingOptions();
  for (const game of Object.values(soloGames)) game.setDasArr(handling);
  dailyGame?.setDasArr(handling);
  versus?.players.forEach((game) => game.setDasArr(handling));
  online?.players.forEach((game) => game.setDasArr(handling));
}

function bindTouchControls(): void {
  app.querySelectorAll<HTMLButtonElement>('[data-touch]').forEach((button) => {
    const control = button.dataset.touch as TouchControl;
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (!controlTarget || controlTarget.isPaused() || controlTarget.isOver() || activeReplay)
        return;
      applyTouch(controlTarget, control);
      recorders.get(controlTarget)?.record('action', actionForTouchControl(control));
      maybeUnlock();
    });
    button.addEventListener('pointerup', () => {
      if (controlTarget) releaseTouch(controlTarget, control);
    });
    button.addEventListener('pointerleave', () => {
      if (controlTarget) releaseTouch(controlTarget, control);
    });
  });
}

function bindSettingsMenu(): void {
  const volume = app.querySelector<HTMLInputElement>('[data-testid="settings-volume"]');
  const mute = app.querySelector<HTMLInputElement>('[data-testid="settings-mute"]');
  const das = app.querySelector<HTMLInputElement>('[data-testid="settings-das"]');
  const arr = app.querySelector<HTMLInputElement>('[data-testid="settings-arr"]');
  const musicEnabled = app.querySelector<HTMLInputElement>(
    '[data-testid="settings-music-enabled"]',
  );
  const musicTrack = app.querySelector<HTMLSelectElement>('[data-testid="settings-music-track"]');
  const theme = app.querySelector<HTMLSelectElement>('[data-testid="settings-theme"]');
  const colorblind = app.querySelector<HTMLInputElement>('[data-testid="settings-colorblind"]');
  const contrast = app.querySelector<HTMLSelectElement>('[data-testid="settings-contrast"]');
  volume?.addEventListener('input', () => {
    player.changeDraft({ volume: Number(volume.value) / 100 });
  });
  mute?.addEventListener('change', () => {
    player.changeDraft({ muted: mute.checked });
  });
  das?.addEventListener('change', () => {
    player.changeDraft({ dasMs: Number(das.value) });
  });
  arr?.addEventListener('change', () => {
    player.changeDraft({ arrMs: Number(arr.value) });
  });
  musicEnabled?.addEventListener('change', () => {
    player.changeDraft({ musicEnabled: musicEnabled.checked });
  });
  musicTrack?.addEventListener('change', () => {
    const track = musicTrack.value as typeof player.draft.musicTrack;
    player.changeDraft({ musicTrack: track });
    if (player.audio.musicPlaying) player.audio.selectTrack(track);
    else player.audio.setTrack(track);
  });
  theme?.addEventListener('change', () => {
    player.changeDraft({ theme: theme.value as typeof player.draft.theme });
    applyAppearance(player.draft, document.documentElement);
  });
  colorblind?.addEventListener('change', () => {
    player.changeDraft({ colorblindPalette: colorblind.checked });
    applyAppearance(player.draft, document.documentElement);
  });
  contrast?.addEventListener('change', () => {
    player.changeDraft({ contrast: contrast.value as typeof player.draft.contrast });
    applyAppearance(player.draft, document.documentElement);
  });
  app.querySelectorAll<HTMLButtonElement>('[data-binding]').forEach((button) => {
    button.addEventListener('click', () => {
      capturingBinding = (button.dataset.binding as GameAction | undefined) ?? null;
      button.classList.add('is-listening');
    });
  });
  app.querySelector('[data-action="close-settings"]')?.addEventListener('click', () => {
    player.closeSettings();
    applySettingsToGames();
    currentView = 'menu';
    capturingBinding = null;
    render();
  });
}

function applyDocumentAppearance() {
  const source = player.menuOpen ? player.draft : player.settings;
  return applyAppearance(source, document.documentElement);
}

function isPlayView(view: View): boolean {
  return isSoloMode(view) || view === 'daily' || view === 'versus' || view === 'online';
}

function syncGameplayMusic(): void {
  if (player.settings.musicEnabled && !player.audio.muted && isPlayView(currentView)) {
    if (!player.audio.musicPlaying) player.audio.startGameplayMusic();
  } else if (player.audio.musicPlaying && !isPlayView(currentView)) {
    player.audio.stopGameplayMusic();
  }
}

function effectsFor(game: Game): EffectsController {
  return effectControllers.get(game) ?? createEffectsController();
}

function startLastReplay(): void {
  const log = loadLastReplay(store);
  if (!log) return;
  const playback = playReplay(log);
  activeReplay = playback;
  replayGames.add(playback.game);
  const mode: SoloMode =
    log.mode === 'sprint' || log.mode === 'ultra' || log.mode === 'zen' ? log.mode : 'marathon';
  currentView = mode;
  soloGames[mode] = playback.game;
  if (mode === 'marathon') {
    marathon = playback.game;
    achievements.attach(marathon);
  }
  listenToGame(playback.game);
  controlTarget = null;
  window.tetrisGame = playback.game;
  render();
}

function applyResponsiveLayout(): void {
  const layout = computeGameLayout(window.innerWidth);
  const vars = layoutCssVars(layout);
  for (const [name, value] of Object.entries(vars)) {
    document.documentElement.style.setProperty(name, value);
  }
  document.documentElement.dataset.bp = layout.breakpoint;
  app.dataset.bp = layout.breakpoint;
  app.dataset.overflowX = String(layout.overflowX);
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
