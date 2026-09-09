import { createGame, type Game } from '../game/engine';
import { createAudioController, MUSIC_TRACKS, type AudioController } from './audio';
import { cloneBindings, GAME_ACTIONS, remapBinding, type GameAction } from './controls';
import {
  loadPlayerState,
  recordHighScore,
  savePlayerState,
  type KeyValueStore,
  type PlayerPersistState,
  type PlayerSettings,
} from './persistence';
import { CONTRAST_LEVELS, THEMES } from './themes';
import { FONT_SIZE_IDS, resolveTypography } from './typography';

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
  const type = resolveTypography(settings.fontSize);
  const bindingRows = GAME_ACTIONS.map((action) => {
    const keys = settings.bindings[action].join(', ');
    return `<button type="button" class="binding-row" data-binding="${action}" data-testid="binding-${action}" data-keyboard-item="true" aria-label="${labelForAction(action)} key binding">
      <span>${labelForAction(action)}</span>
      <kbd data-testid="binding-value-${action}">${escapeHtml(keys)}</kbd>
    </button>`;
  }).join('');

  return `
    <section class="settings-menu" data-testid="settings-menu" data-font-size="${type.fontSize}" aria-label="Settings menu" style="--font-scale: ${type.scale}">
      <h1>Settings</h1>
      <div class="settings-block" data-testid="settings-bindings">
        <h2>Key bindings</h2>
        ${bindingRows}
      </div>
      <form class="settings" data-testid="settings-audio">
        <label>Volume
          <input id="volume-input" data-testid="settings-volume" data-keyboard-item="true" type="range" min="0" max="100" value="${Math.round(settings.volume * 100)}" aria-label="Volume" />
        </label>
        <label class="mute-toggle">
          <input id="mute-input" data-testid="settings-mute" data-keyboard-item="true" type="checkbox" ${settings.muted ? 'checked' : ''} aria-label="Mute sound effects" />
          Mute
        </label>
      </form>
      <form class="settings" data-testid="settings-music">
        <label class="mute-toggle">
          <input id="music-enabled-input" data-testid="settings-music-enabled" data-keyboard-item="true" type="checkbox" ${settings.musicEnabled ? 'checked' : ''} aria-label="Enable background music" />
          Background music
        </label>
        <label>Music track
          <select id="music-track-input" data-testid="settings-music-track" data-keyboard-item="true" aria-label="Music track">
            ${MUSIC_TRACKS.map(
              (track) =>
                `<option value="${track.id}" ${settings.musicTrack === track.id ? 'selected' : ''} aria-label="${track.name} music track">${track.name}</option>`,
            ).join('')}
          </select>
        </label>
      </form>
      <form class="settings" data-testid="settings-theme">
        <label>Theme
          <select id="theme-input" data-testid="settings-theme" data-keyboard-item="true" aria-label="Theme">
            ${Object.values(THEMES)
              .map(
                (theme) =>
                  `<option value="${theme.id}" ${settings.theme === theme.id ? 'selected' : ''} aria-label="${theme.name} theme">${theme.name}</option>`,
              )
              .join('')}
          </select>
        </label>
      </form>
      <form class="settings" data-testid="settings-accessibility">
        <label class="mute-toggle">
          <input id="colorblind-input" data-testid="settings-colorblind" data-keyboard-item="true" type="checkbox" ${settings.colorblindPalette ? 'checked' : ''} aria-label="Colorblind-friendly palette" />
          Colorblind-friendly palette
        </label>
        <label>Contrast
          <select id="contrast-input" data-testid="settings-contrast" data-keyboard-item="true" aria-label="Contrast">
            ${CONTRAST_LEVELS.map(
              (level) =>
                `<option value="${level}" ${settings.contrast === level ? 'selected' : ''} aria-label="${level} contrast">${level === 'high' ? 'High' : 'Normal'}</option>`,
            ).join('')}
          </select>
        </label>
        <label>Font size
          <select id="font-size-input" data-testid="settings-font-size" data-keyboard-item="true" aria-label="Font size">
            ${FONT_SIZE_IDS.map(
              (size) =>
                `<option value="${size}" ${settings.fontSize === size ? 'selected' : ''} aria-label="${size} font size">${size[0]!.toUpperCase()}${size.slice(1)}</option>`,
            ).join('')}
          </select>
        </label>
      </form>
      <form class="settings" data-testid="settings-handling">
        <label>DAS (ms)
          <input id="settings-das" data-testid="settings-das" data-keyboard-item="true" type="number" min="0" step="10" value="${settings.dasMs}" aria-label="DAS delay in milliseconds" />
        </label>
        <label>ARR (ms)
          <input id="settings-arr" data-testid="settings-arr" data-keyboard-item="true" type="number" min="0" step="1" value="${settings.arrMs}" aria-label="ARR repeat in milliseconds" />
        </label>
      </form>
      <div class="actions">
        <button type="button" data-action="close-settings" data-testid="settings-close" data-keyboard-item="true" aria-label="Close settings">Close</button>
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
    options.audio ??
    createAudioController({
      muted: settings.muted,
      volume: settings.volume,
      musicEnabled: settings.musicEnabled,
      track: settings.musicTrack,
    });
  audio.setMuted(settings.muted);
  audio.setVolume(settings.volume);
  audio.setMusicEnabled(settings.musicEnabled);
  audio.setTrack(settings.musicTrack);

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
        musicEnabled: session.draft.musicEnabled,
        musicTrack: session.draft.musicTrack,
        theme: session.draft.theme,
        colorblindPalette: session.draft.colorblindPalette,
        contrast: session.draft.contrast,
        fontSize: session.draft.fontSize,
      };
      session.settings = next;
      session.game.setDasArr({ dasMs: next.dasMs, arrMs: next.arrMs });
      session.audio.setVolume(next.volume);
      session.audio.setMuted(next.muted);
      session.audio.setMusicEnabled(next.musicEnabled);
      if (session.audio.musicPlaying) session.audio.selectTrack(next.musicTrack);
      else session.audio.setTrack(next.musicTrack);
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
