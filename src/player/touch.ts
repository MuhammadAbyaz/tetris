import type { Game } from '../game/engine';
import { dispatchAction, releaseAction, type GameAction } from './controls';

export const TOUCH_CONTROLS = [
  'moveLeft',
  'moveRight',
  'rotate',
  'softDrop',
  'hardDrop',
  'hold',
] as const;

export type TouchControl = (typeof TOUCH_CONTROLS)[number];
export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export type TouchGesture =
  { type: 'tap'; control: TouchControl } | { type: 'swipe'; direction: SwipeDirection };

const TOUCH_TO_ACTION: Record<TouchControl, GameAction> = {
  moveLeft: 'moveLeft',
  moveRight: 'moveRight',
  rotate: 'rotateCw',
  softDrop: 'softDrop',
  hardDrop: 'hardDrop',
  hold: 'hold',
};

const SWIPE_TO_ACTION: Record<SwipeDirection, GameAction> = {
  left: 'moveLeft',
  right: 'moveRight',
  down: 'softDrop',
  up: 'hardDrop',
};

export function actionForTouchControl(control: TouchControl): GameAction {
  return TOUCH_TO_ACTION[control];
}

export function actionForGesture(gesture: TouchGesture): GameAction {
  if (gesture.type === 'tap') return actionForTouchControl(gesture.control);
  return SWIPE_TO_ACTION[gesture.direction];
}

export function applyTouch(game: Game, control: TouchControl): boolean {
  return dispatchAction(game, actionForTouchControl(control));
}

export function applyGesture(game: Game, gesture: TouchGesture): boolean {
  return dispatchAction(game, actionForGesture(gesture));
}

export function releaseTouch(game: Game, control: TouchControl): void {
  releaseAction(game, actionForTouchControl(control));
}

export function renderTouchControls(): string {
  const buttons = [
    { control: 'moveLeft', label: 'Left' },
    { control: 'moveRight', label: 'Right' },
    { control: 'rotate', label: 'Rotate' },
    { control: 'softDrop', label: 'Soft' },
    { control: 'hardDrop', label: 'Hard' },
    { control: 'hold', label: 'Hold' },
  ]
    .map(
      ({ control, label }) =>
        `<button type="button" class="touch-btn" data-touch="${control}" data-testid="touch-${control}">${label}</button>`,
    )
    .join('');

  return `
    <div class="touch-controls" data-testid="touch-controls" data-gesture-zones="true">
      ${buttons}
    </div>`;
}
