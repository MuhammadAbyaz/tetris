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

export { attachGameAudio, createAudioController, SFX_EVENTS } from './audio';
export type { AudioController, SfxEvent, SfxPlayer } from './audio';

export { breakpointForWidth, cellSizeForWidth, computeGameLayout, layoutCssVars } from './layout';
export type { GameLayout, LayoutBreakpoint, LayoutRect } from './layout';

export { createPlayerSession, renderSettingsMenu } from './settings';
export type { PlayerSession, SettingsDraft } from './settings';
