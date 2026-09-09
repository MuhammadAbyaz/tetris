export {
  actionForKey,
  cloneBindings,
  DEFAULT_BINDINGS,
  dispatchAction,
  GAME_ACTIONS,
  handleKeyDown,
  handleKeyUp,
  normalizeKey,
  releaseAction,
  remapBinding,
} from './controls';
export type { GameAction, KeyBindings } from './controls';

export {
  browserStore,
  createMemoryStore,
  defaultPlayerState,
  DEFAULT_PLAYER_SETTINGS,
  loadPlayerState,
  PLAYER_STORAGE_KEY,
  recordHighScore,
  savePlayerState,
  saveSettings,
} from './persistence';
export type { KeyValueStore, PlayerPersistState, PlayerSettings } from './persistence';

export {
  actionForGesture,
  actionForTouchControl,
  applyGesture,
  applyTouch,
  releaseTouch,
  renderTouchControls,
  TOUCH_CONTROLS,
} from './touch';
export type { SwipeDirection, TouchControl, TouchGesture } from './touch';

export {
  attachGameAudio,
  createAudioController,
  DEFAULT_MUSIC_TRACK,
  MUSIC_TRACKS,
  SFX_EVENTS,
} from './audio';
export type { AudioController, MusicTrackId, SfxEvent, SfxPlayer } from './audio';

export { breakpointForWidth, cellSizeForWidth, computeGameLayout, layoutCssVars } from './layout';
export type { GameLayout, LayoutBreakpoint, LayoutRect } from './layout';

export { createPlayerSession, renderSettingsMenu } from './settings';
export type { PlayerSession, SettingsDraft } from './settings';

export {
  applyAppearance,
  COLORBLIND_PIECE_COLORS,
  CONTRAST_LEVELS,
  resolveAppearance,
  resolvePieceColors,
  resolveTheme,
  THEME_IDS,
  THEMES,
} from './themes';
export type { Appearance, ContrastLevel, ThemeId, ThemeTokens } from './themes';

export { createEffectsController, LEVEL_UP_FX_MS, LINE_CLEAR_FX_MS } from './effects';
export type { EffectsController, LevelUpEffect, LineClearEffect } from './effects';

export {
  getLocalRecords,
  getLocalRecordsByMode,
  LOCAL_LEADERBOARD_KEY,
  LOCAL_LEADERBOARD_LIMIT,
  renderLocalLeaderboard,
  submitLocalRecord,
} from './local-leaderboard';
export type { LocalRecord, LocalRecordInput } from './local-leaderboard';

export {
  createReplayRecorder,
  hasLastReplay,
  LAST_REPLAY_KEY,
  loadLastReplay,
  playReplay,
  saveLastReplay,
} from './replay';
export type { ReplayEvent, ReplayLog, ReplayPlayback, ReplayRecorder } from './replay';
