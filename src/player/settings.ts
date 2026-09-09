import { createGame, type Game } from '../game/engine';
import { createAudioController, type AudioController } from './audio';
import { cloneBindings, GAME_ACTIONS, remapBinding, type GameAction } from './controls';
import {
  loadPlayerState,
  recordHighScore,
  savePlayerState,
  type KeyValueStore,
  type PlayerPersistState,
  type PlayerSettings,
} from './persistence';

export interface SettingsDraft extends PlayerSettings {
  awaitingAction: GameAction | null;
}

export interface PlayerSession {
  game: Game;
  audio: AudioController;
  store: KeyValueStore;
  highScore: number;
  settings: PlayerSettings;
  menuOpen: boolean;
  draft: SettingsDraft;
  openSettings(): string;
  changeDraft(partial: Partial<PlayerSettings>): void;
  captureBinding(action: GameAction, key: string): void;
  closeSettings(): PlayerSettings;
  persistScore(score: number): number;
  reopen(): PlayerSession;
}

export function renderSettingsMenu(settings: PlayerSettings): string {
  const bindingRows = GAME_ACTIONS.map((action) => {
    const keys = settings.bindings[action].join(', ');
    return `<button type="button" class="binding-row" data-binding="${action}" data-testid="binding-${action}">
      <span>${labelForAction(action)}</span>
      <kbd data-testid="binding-value-${action}">${escapeHtml(keys)}</kbd>
    </button>`;
  }).join('');

  return `
    <section class="settings-menu" data-testid="settings-menu">
      <h1>Settings</h1>
      <div class="settings-block" data-testid="settings-bindings">
        <h2>Key bindings</h2>
        ${bindingRows}
      </div>
      <form class="settings" data-testid="settings-audio">
        <label>Volume
          <input id="volume-input" data-testid="settings-volume" type="range" min="0" max="100" value="${Math.round(settings.volume * 100)}" />
        </label>
        <label class="mute-toggle">
          <input id="mute-input" data-testid="settings-mute" type="checkbox" ${settings.muted ? 'checked' : ''} />
          Mute
        </label>
      </form>
      <form class="settings" data-testid="settings-handling">
        <label>DAS (ms)
          <input id="settings-das" data-testid="settings-das" type="number" min="0" step="10" value="${settings.dasMs}" />
        </label>
        <label>ARR (ms)
          <input id="settings-arr" data-testid="settings-arr" type="number" min="0" step="1" value="${settings.arrMs}" />
        </label>
      </form>
      <div class="actions">
        <button type="button" data-action="close-settings" data-testid="settings-close">Close</button>
      </div>
    </section>`;
}

export function createPlayerSession(options: {
  store: KeyValueStore;
  game?: Game;
  audio?: AudioController;
}): PlayerSession {
  const stored = loadPlayerState(options.store);
  const settings = { ...stored.settings, bindings: cloneBindings(stored.settings.bindings) };
  const game =
    options.game ??
    createGame({
      gravityMs: 1_000_000,
      dasMs: settings.dasMs,
      arrMs: settings.arrMs,
    });
  game.setDasArr({ dasMs: settings.dasMs, arrMs: settings.arrMs });
  const audio =
    options.audio ?? createAudioController({ muted: settings.muted, volume: settings.volume });
  audio.setMuted(settings.muted);
  audio.setVolume(settings.volume);

  const session: PlayerSession = {
    game,
    audio,
    store: options.store,
    highScore: stored.highScore,
    settings,
    menuOpen: false,
    draft: { ...settings, bindings: cloneBindings(settings.bindings), awaitingAction: null },
    openSettings() {
      session.menuOpen = true;
      session.draft = {
        ...session.settings,
        bindings: cloneBindings(session.settings.bindings),
        awaitingAction: null,
      };
      return renderSettingsMenu(session.draft);
    },
    changeDraft(partial) {
      session.draft = {
        ...session.draft,
        ...partial,
        bindings: partial.bindings ? cloneBindings(partial.bindings) : session.draft.bindings,
      };
    },
    captureBinding(action, key) {
      session.draft.bindings = remapBinding(session.draft.bindings, action, key);
      session.draft.awaitingAction = null;
    },
    closeSettings() {
      session.menuOpen = false;
      const next: PlayerSettings = {
        volume: session.draft.volume,
        muted: session.draft.muted,
        dasMs: session.draft.dasMs,
        arrMs: session.draft.arrMs,
        bindings: cloneBindings(session.draft.bindings),
      };
      session.settings = next;
      session.game.setDasArr({ dasMs: next.dasMs, arrMs: next.arrMs });
      session.audio.setVolume(next.volume);
      session.audio.setMuted(next.muted);
      persist(session);
      return next;
    },
    persistScore(score) {
      session.highScore = recordHighScore(session.store, score);
      persist(session);
      return session.highScore;
    },
    reopen() {
      return createPlayerSession({ store: session.store });
    },
  };

  persist(session);
  return session;
}

function persist(session: PlayerSession): PlayerPersistState {
  return savePlayerState(session.store, {
    highScore: session.highScore,
    settings: session.settings,
  });
}

function labelForAction(action: GameAction): string {
  const labels: Record<GameAction, string> = {
    moveLeft: 'Move left',
    moveRight: 'Move right',
    softDrop: 'Soft drop',
    hardDrop: 'Hard drop',
    rotateCw: 'Rotate CW',
    rotateCcw: 'Rotate CCW',
    rotate180: 'Rotate 180',
    hold: 'Hold',
    pause: 'Pause',
  };
  return labels[action];
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
}
