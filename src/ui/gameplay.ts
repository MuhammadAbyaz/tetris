import {
  createGame,
  VISIBLE_COLS,
  type Game,
  type GameOptions,
  type GameOverReason,
  type TimerKind,
} from '../game/engine';
import type { EffectsController } from '../player/effects';
import { renderTouchControls } from '../player/touch';

export type ScreenView = 'menu' | 'playing';
export type ScreenPhase = 'playing' | 'paused' | 'game-over' | 'menu';

export interface GameplayLayout {
  columns: Array<'hold' | 'playfield' | 'next'>;
  playfieldPosition: 'center' | 'left' | 'right';
  holdPosition: 'left' | 'right' | 'none';
  nextQueuePosition: 'left' | 'right' | 'none';
}

export interface HudModel {
  visible: boolean;
  score: number;
  level: number;
  lines: number;
  combo: number;
  backToBack: boolean;
  timerVisible: boolean;
  timerKind: TimerKind;
  timerMs: number;
}

export interface PauseOverlayModel {
  visible: boolean;
  coversPlayfield: boolean;
  opaque: boolean;
  revealsPlayfield: boolean;
}

export interface GameOverModel {
  score: number;
  lines: number;
  level: number;
  elapsedMs: number;
  reason: GameOverReason | null;
  title: string;
}

export interface GameplayRender {
  html: string;
  view: ScreenView;
  phase: ScreenPhase;
  hud: HudModel;
  pauseOverlay: PauseOverlayModel;
  gameOver: GameOverModel | null;
}

export interface GameplayScreenOptions {
  game?: Game;
  gameOptions?: GameOptions;
  title?: string;
  testId?: string;
  highScore?: number;
  muted?: boolean;
  effects?: EffectsController;
  replayAvailable?: boolean;
  appearanceTheme?: string;
  boardBackground?: string;
}

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function parseGameplayLayout(html: string): GameplayLayout {
  const hold = html.indexOf('data-testid="hold-box"');
  const playfield = html.indexOf('data-testid="playfield"');
  const next = html.indexOf('data-testid="next-queue"');
  const order = [
    { key: 'hold' as const, index: hold },
    { key: 'playfield' as const, index: playfield },
    { key: 'next' as const, index: next },
  ]
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.key);

  return {
    columns: order,
    playfieldPosition: order[1] === 'playfield' ? 'center' : 'left',
    holdPosition: order[0] === 'hold' ? 'left' : 'none',
    nextQueuePosition: order[order.length - 1] === 'next' ? 'right' : 'none',
  };
}

export function renderGameplayShell(input: {
  game: Game;
  title?: string;
  testId?: string;
  highScore?: number;
  muted?: boolean;
  effects?: EffectsController;
  replayAvailable?: boolean;
  appearanceTheme?: string;
  boardBackground?: string;
}): GameplayRender {
  return createGameplayScreen({
    game: input.game,
    title: input.title,
    testId: input.testId,
    highScore: input.highScore,
    muted: input.muted,
    effects: input.effects,
    replayAvailable: input.replayAvailable,
    appearanceTheme: input.appearanceTheme,
    boardBackground: input.boardBackground,
  }).render();
}

export function createGameplayScreen(options: GameplayScreenOptions = {}): GameplayScreen {
  return new GameplayScreen(options);
}

export class GameplayScreen {
  game: Game;
  view: ScreenView = 'playing';
  title: string;
  testId: string;
  highScore: number;
  muted: boolean;
  effects: EffectsController | null;
  replayAvailable: boolean;
  appearanceTheme: string;
  boardBackground: string;

  constructor(options: GameplayScreenOptions = {}) {
    this.game = options.game ?? createGame(options.gameOptions ?? {});
    this.title = options.title ?? 'Marathon';
    this.testId = options.testId ?? 'gameplay';
    this.highScore = options.highScore ?? 0;
    this.muted = options.muted ?? false;
    this.effects = options.effects ?? null;
    this.replayAvailable = options.replayAvailable ?? false;
    this.appearanceTheme = options.appearanceTheme ?? 'classic';
    this.boardBackground = options.boardBackground ?? '#07090d';
  }

  render(): GameplayRender {
    if (this.view === 'menu') {
      return {
        html: `<section class="hub" data-testid="main-menu">
          <h1>Tetris</h1>
          <p class="lede">Main menu</p>
        </section>`,
        view: 'menu',
        phase: 'menu',
        hud: {
          visible: false,
          score: 0,
          level: 1,
          lines: 0,
          combo: 0,
          backToBack: false,
          timerVisible: false,
          timerKind: 'elapsed',
          timerMs: 0,
        },
        pauseOverlay: idlePauseOverlay(),
        gameOver: null,
      };
    }

    const over = this.game.isOver();
    const paused = this.game.isPaused();
    const phase: ScreenPhase = over ? 'game-over' : paused ? 'paused' : 'playing';
    const timer = this.game.getTimerDisplay();
    const hud: HudModel = {
      visible: true,
      score: this.game.score,
      level: this.game.level,
      lines: this.game.lines,
      combo: this.game.combo,
      backToBack: this.game.backToBackActive,
      timerVisible: timer.visible,
      timerKind: timer.kind,
      timerMs: timer.ms,
    };
    const pauseOverlay: PauseOverlayModel = paused
      ? {
          visible: true,
          coversPlayfield: true,
          opaque: true,
          revealsPlayfield: false,
        }
      : idlePauseOverlay();
    const gameOver: GameOverModel | null = over
      ? {
          score: this.game.score,
          lines: this.game.lines,
          level: this.game.level,
          elapsedMs: this.game.elapsedMs,
          reason: this.game.getGameOverReason(),
          title: gameOverTitle(this.game.getGameOverReason()),
        }
      : null;

    return {
      html: this.renderPlayingHtml(paused, over, hud, gameOver),
      view: 'playing',
      phase,
      hud,
      pauseOverlay,
      gameOver,
    };
  }

  pause(): void {
    this.game.pause();
  }

  resume(): void {
    this.game.resume();
  }

  selectRestart(): void {
    this.view = 'playing';
    this.game = createGame({
      gravityMs: this.game.baseGravityMs,
      minGravityMs: this.game.minGravityMs,
      linesPerLevel: this.game.linesPerLevel,
      softDropMs: this.game.softDropMs,
      dasMs: this.game.dasMs,
      arrMs: this.game.arrMs,
      nextQueueSize: this.game.nextQueueSize,
      mode: this.game.mode,
      lineTarget: this.game.lineTarget,
      timeLimitMs: this.game.timeLimitMs,
      noFail: this.game.noFail,
    });
  }

  selectMenu(): void {
    this.view = 'menu';
    this.game.resume();
  }

  private renderPlayingHtml(
    paused: boolean,
    over: boolean,
    hud: HudModel,
    gameOver: GameOverModel | null,
  ): string {
    const elapsed = formatElapsed(this.game.elapsedMs);
    const timer = hud.timerVisible
      ? `<div class="hud-stat" data-testid="hud-timer" data-timer-kind="${hud.timerKind}">${formatTimerStat(hud.timerKind, hud.timerMs)}</div>`
      : '';
    return `
    <div class="shell" data-testid="${this.testId}-shell" data-layout="hold-playfield-next" data-mode="${this.game.mode}" data-theme="${escapeHtml(this.appearanceTheme)}">
      <div class="hud-panel" data-testid="hud-panel" data-always-visible="true" data-region="score-panel">
        <div class="hud-stat" data-testid="hud-score">Score ${hud.score}</div>
        <div class="hud-stat" data-testid="hud-high-score">Best ${this.highScore}</div>
        <div class="hud-stat" data-testid="hud-level">Level ${hud.level}</div>
        <div class="hud-stat" data-testid="hud-lines">Lines ${hud.lines}</div>
        <div class="hud-stat" data-testid="hud-combo">Combo ${hud.combo}</div>
        <div class="hud-stat" data-testid="hud-back-to-back">${hud.backToBack ? 'Back-to-back' : 'No streak'}</div>
        ${timer}
        <div class="hud-actions">
          <button type="button" data-action="toggle-mute" data-testid="mute-toggle" data-muted="${this.muted}" aria-label="${this.muted ? 'Unmute sound' : 'Mute sound'}">${this.muted ? 'Unmute' : 'Mute'}</button>
          <button type="button" data-action="open-settings" data-testid="open-settings" aria-label="Open settings">Settings</button>
        </div>
      </div>
      <aside class="panel hold-panel">
        <h2>Hold</h2>
        <div class="preview-box" data-testid="hold-box"></div>
      </aside>
      <section class="board-wrap" data-testid="playfield-column">
        <h1>${escapeHtml(this.title)}</h1>
        <div class="playfield-stack">
          <div
            class="playfield"
            data-testid="playfield"
            data-theme="${escapeHtml(this.appearanceTheme)}"
            data-obscured="${paused || over ? 'true' : 'false'}"
            style="--cols:${VISIBLE_COLS};--board-bg:${escapeHtml(this.boardBackground)}"
          ></div>
          ${this.effects?.renderOverlays() ?? ''}
          ${
            paused
              ? `<div class="pause-overlay" data-testid="pause-overlay" data-covers-playfield="true" data-opaque="true">
                  <p>Paused</p>
                  <button type="button" data-action="resume" aria-label="Resume game">Resume</button>
                </div>`
              : ''
          }
          ${
            over && gameOver
              ? `<div class="game-over-screen" data-testid="game-over-screen" data-reason="${gameOver.reason ?? ''}">
                  <h2>${escapeHtml(gameOver.title)}</h2>
                  <p class="game-over-reason" data-testid="game-over-reason">${formatGameOverReason(gameOver.reason)}</p>
                  <dl class="final-stats">
                    <div><dt>Score</dt><dd data-testid="final-score">${gameOver.score}</dd></div>
                    <div><dt>Lines</dt><dd data-testid="final-lines">${gameOver.lines}</dd></div>
                    <div><dt>Level</dt><dd data-testid="final-level">${gameOver.level}</dd></div>
                    <div><dt>Time</dt><dd data-testid="final-time">${elapsed}</dd></div>
                    ${
                      gameOver.reason === 'sprint-complete'
                        ? `<div><dt>Finish time</dt><dd data-testid="completion-time">${elapsed}</dd></div>`
                        : ''
                    }
                  </dl>
                  <div class="actions">
                    <button type="button" data-action="restart" data-testid="game-over-restart" aria-label="Restart game">Restart</button>
                    <button type="button" data-action="replay-last" data-testid="replay-last-game" aria-label="Replay last game" ${this.replayAvailable ? '' : 'disabled'}>Replay last game</button>
                    <button type="button" data-action="menu" data-testid="game-over-menu" aria-label="Return to main menu">Menu</button>
                  </div>
                </div>`
              : ''
          }
        </div>
      </section>
      <aside class="panel next-panel">
        <h2>Next</h2>
        <div class="next-queue" data-testid="next-queue"></div>
        <form class="settings" data-testid="das-arr-settings">
          <label>DAS (ms)
            <input id="das-input" type="number" min="0" step="10" value="${this.game.dasMs}" />
          </label>
          <label>ARR (ms)
            <input id="arr-input" type="number" min="0" step="1" value="${this.game.arrMs}" />
          </label>
        </form>
        <p class="help">← → move · ↓ soft · Space hard · Z/X rotate · A 180 · C hold · Esc pause</p>
      </aside>
      ${renderTouchControls()}
    </div>`;
  }
}

function formatGameOverReason(reason: GameOverModel['reason']): string {
  if (reason === 'block-out') return 'Block out';
  if (reason === 'top-out') return 'Top out';
  if (reason === 'sprint-complete') return '40 lines';
  if (reason === 'time-up') return "Time's up";
  return 'No valid spawn';
}

function gameOverTitle(reason: GameOverModel['reason']): string {
  if (reason === 'sprint-complete') return 'Sprint complete';
  if (reason === 'time-up') return "Time's up";
  return 'Game over';
}

export function formatTimerStat(kind: TimerKind, ms: number): string {
  return kind === 'countdown' ? `Left ${formatElapsed(ms)}` : `Time ${formatElapsed(ms)}`;
}

function idlePauseOverlay(): PauseOverlayModel {
  return {
    visible: false,
    coversPlayfield: false,
    opaque: false,
    revealsPlayfield: false,
  };
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
}
