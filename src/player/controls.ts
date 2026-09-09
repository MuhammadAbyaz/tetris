import type { Game } from '../game/engine';

export const GAME_ACTIONS = [
  'moveLeft',
  'moveRight',
  'softDrop',
  'hardDrop',
  'rotateCw',
  'rotateCcw',
  'rotate180',
  'hold',
  'pause',
] as const;

export type GameAction = (typeof GAME_ACTIONS)[number];
export type KeyBindings = Record<GameAction, string[]>;

export const DEFAULT_BINDINGS: KeyBindings = {
  moveLeft: ['ArrowLeft'],
  moveRight: ['ArrowRight'],
  softDrop: ['ArrowDown'],
  hardDrop: ['Space'],
  rotateCw: ['ArrowUp', 'x'],
  rotateCcw: ['z'],
  rotate180: ['a'],
  hold: ['c', 'Shift'],
  pause: ['Escape'],
};

export function cloneBindings(bindings: KeyBindings = DEFAULT_BINDINGS): KeyBindings {
  return GAME_ACTIONS.reduce((acc, action) => {
    acc[action] = [...bindings[action]];
    return acc;
  }, {} as KeyBindings);
}

export function normalizeKey(key: string): string {
  if (key === ' ' || key === 'Spacebar') return 'Space';
  if (key.length === 1) return key.toLowerCase();
  return key;
}

export function actionForKey(bindings: KeyBindings, key: string): GameAction | null {
  const normalized = normalizeKey(key);
  for (const action of GAME_ACTIONS) {
    if (bindings[action].map(normalizeKey).includes(normalized)) return action;
  }
  return null;
}

export function remapBinding(bindings: KeyBindings, action: GameAction, key: string): KeyBindings {
  const normalized = normalizeKey(key);
  const next = cloneBindings(bindings);
  for (const name of GAME_ACTIONS) {
    next[name] = next[name].map(normalizeKey).filter((bound) => bound !== normalized);
  }
  next[action] = [normalized];
  return next;
}

export function dispatchAction(game: Game, action: GameAction): boolean {
  switch (action) {
    case 'moveLeft':
      game.pressLeft();
      return true;
    case 'moveRight':
      game.pressRight();
      return true;
    case 'softDrop':
      game.pressSoftDrop();
      return true;
    case 'hardDrop':
      game.hardDrop();
      return true;
    case 'rotateCw':
      return game.rotateCw().success;
    case 'rotateCcw':
      return game.rotateCcw().success;
    case 'rotate180':
      return game.rotate180().success;
    case 'hold':
      return game.holdPiece();
    case 'pause':
      game.togglePause();
      return true;
  }
}

export function releaseAction(game: Game, action: GameAction): void {
  if (action === 'moveLeft') game.releaseLeft();
  if (action === 'moveRight') game.releaseRight();
  if (action === 'softDrop') game.releaseSoftDrop();
}

export function handleKeyDown(bindings: KeyBindings, game: Game, key: string): GameAction | null {
  const action = actionForKey(bindings, key);
  if (!action) return null;
  dispatchAction(game, action);
  return action;
}

export function handleKeyUp(bindings: KeyBindings, game: Game, key: string): void {
  const action = actionForKey(bindings, key);
  if (action) releaseAction(game, action);
}
