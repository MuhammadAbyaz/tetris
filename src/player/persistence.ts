import { cloneBindings, DEFAULT_BINDINGS, type KeyBindings } from './controls';
import { DEFAULT_MUSIC_TRACK, isMusicTrackId, type MusicTrackId } from './audio';
import { isContrastLevel, isThemeId, type ContrastLevel, type ThemeId } from './themes';
import { isFontSizeId, type FontSizeId } from './typography';

export const PLAYER_STORAGE_KEY = 'tetris.player.v1';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface PlayerSettings {
  volume: number;
  muted: boolean;
  dasMs: number;
  arrMs: number;
  bindings: KeyBindings;
  musicEnabled: boolean;
  musicTrack: MusicTrackId;
  theme: ThemeId;
  colorblindPalette: boolean;
  contrast: ContrastLevel;
  fontSize: FontSizeId;
}

export interface PlayerPersistState {
  highScore: number;
  settings: PlayerSettings;
}

export const DEFAULT_PLAYER_SETTINGS: PlayerSettings = {
  volume: 0.7,
  muted: false,
  dasMs: 167,
  arrMs: 33,
  bindings: cloneBindings(DEFAULT_BINDINGS),
  musicEnabled: true,
  musicTrack: DEFAULT_MUSIC_TRACK,
  theme: 'classic',
  colorblindPalette: false,
  contrast: 'normal',
  fontSize: 'medium',
};

export function createMemoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

export function browserStore(): KeyValueStore {
  if (typeof localStorage === 'undefined') return createMemoryStore();
  return localStorage;
}

export function defaultPlayerState(): PlayerPersistState {
  return {
    highScore: 0,
    settings: {
      ...DEFAULT_PLAYER_SETTINGS,
      bindings: cloneBindings(DEFAULT_BINDINGS),
    },
  };
}

export function loadPlayerState(store: KeyValueStore = browserStore()): PlayerPersistState {
  const raw = store.getItem(PLAYER_STORAGE_KEY);
  if (!raw) return defaultPlayerState();
  try {
    const parsed = JSON.parse(raw) as Partial<PlayerPersistState>;
    return normalizeState(parsed);
  } catch {
    return defaultPlayerState();
  }
}

export function savePlayerState(
  store: KeyValueStore,
  state: PlayerPersistState,
): PlayerPersistState {
  const next = normalizeState(state);
  store.setItem(PLAYER_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function recordHighScore(store: KeyValueStore, score: number): number {
  const current = loadPlayerState(store);
  const highScore = Math.max(current.highScore, Math.max(0, Math.floor(score)));
  savePlayerState(store, { ...current, highScore });
  return highScore;
}

export function saveSettings(store: KeyValueStore, settings: PlayerSettings): PlayerSettings {
  const current = loadPlayerState(store);
  const next = savePlayerState(store, {
    ...current,
    settings: normalizeSettings(settings),
  });
  return next.settings;
}

function normalizeState(
  value: Partial<PlayerPersistState> | PlayerPersistState,
): PlayerPersistState {
  return {
    highScore: Math.max(0, Math.floor(Number(value.highScore) || 0)),
    settings: normalizeSettings(value.settings ?? DEFAULT_PLAYER_SETTINGS),
  };
}

function normalizeSettings(settings: Partial<PlayerSettings>): PlayerSettings {
  const volume = clamp(Number(settings.volume), 0, 1, DEFAULT_PLAYER_SETTINGS.volume);
  return {
    volume,
    muted: Boolean(settings.muted),
    dasMs: Math.max(0, Math.floor(Number(settings.dasMs) || DEFAULT_PLAYER_SETTINGS.dasMs)),
    arrMs: Math.max(0, Math.floor(Number(settings.arrMs) || DEFAULT_PLAYER_SETTINGS.arrMs)),
    bindings: {
      ...cloneBindings(DEFAULT_BINDINGS),
      ...(settings.bindings ?? {}),
    },
    musicEnabled: settings.musicEnabled ?? DEFAULT_PLAYER_SETTINGS.musicEnabled,
    musicTrack: (() => {
      const track = String(settings.musicTrack ?? '');
      return isMusicTrackId(track) ? track : DEFAULT_PLAYER_SETTINGS.musicTrack;
    })(),
    theme: (() => {
      const theme = String(settings.theme ?? '');
      return isThemeId(theme) ? theme : DEFAULT_PLAYER_SETTINGS.theme;
    })(),
    colorblindPalette: Boolean(settings.colorblindPalette),
    contrast: (() => {
      const contrast = String(settings.contrast ?? '');
      return isContrastLevel(contrast) ? contrast : DEFAULT_PLAYER_SETTINGS.contrast;
    })(),
    fontSize: (() => {
      const fontSize = String(settings.fontSize ?? '');
      return isFontSizeId(fontSize) ? fontSize : DEFAULT_PLAYER_SETTINGS.fontSize;
    })(),
  };
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
