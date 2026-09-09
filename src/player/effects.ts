import type { Game } from '../game/engine';

export const LINE_CLEAR_FX_MS = 520;
export const LEVEL_UP_FX_MS = 900;

export interface LineClearEffect {
  kind: 'lineClear';
  playing: boolean;
  enhanced: true;
  style: 'burst';
  rows: number[];
  remainingMs: number;
}

export interface LevelUpEffect {
  kind: 'levelUp';
  playing: boolean;
  enhanced: true;
  style: 'flourish';
  level: number;
  remainingMs: number;
}

export interface EffectsController {
  lineClear: LineClearEffect | null;
  levelUp: LevelUpEffect | null;
  notifyLineClear(rows: number[]): LineClearEffect;
  notifyLevelUp(level: number): LevelUpEffect;
  tick(dtMs: number): void;
  attach(game: Game): () => void;
  renderOverlays(): string;
}

export function createEffectsController(): EffectsController {
  const controller: EffectsController = {
    lineClear: null,
    levelUp: null,
    notifyLineClear(rows) {
      const effect: LineClearEffect = {
        kind: 'lineClear',
        playing: true,
        enhanced: true,
        style: 'burst',
        rows: [...rows],
        remainingMs: LINE_CLEAR_FX_MS,
      };
      controller.lineClear = effect;
      return effect;
    },
    notifyLevelUp(level) {
      const effect: LevelUpEffect = {
        kind: 'levelUp',
        playing: true,
        enhanced: true,
        style: 'flourish',
        level,
        remainingMs: LEVEL_UP_FX_MS,
      };
      controller.levelUp = effect;
      return effect;
    },
    tick(dtMs) {
      if (controller.lineClear) {
        controller.lineClear.remainingMs -= dtMs;
        if (controller.lineClear.remainingMs <= 0) {
          controller.lineClear.playing = false;
        }
      }
      if (controller.levelUp) {
        controller.levelUp.remainingMs -= dtMs;
        if (controller.levelUp.remainingMs <= 0) {
          controller.levelUp.playing = false;
        }
      }
    },
    attach(game) {
      return game.onCue((cue) => {
        if (cue === 'lineClear') controller.notifyLineClear(game.getClearingRows());
        if (cue === 'levelUp') controller.notifyLevelUp(game.level);
      });
    },
    renderOverlays() {
      const parts: string[] = [];
      if (controller.lineClear?.playing) {
        parts.push(`<div
          class="fx-line-clear fx-burst"
          data-testid="line-clear-effect"
          data-playing="true"
          data-enhanced="true"
          data-style="burst"
          data-rows="${controller.lineClear.rows.join(',')}"
          aria-hidden="true"
        ></div>`);
      }
      if (controller.levelUp?.playing) {
        parts.push(`<div
          class="fx-level-up fx-flourish"
          data-testid="level-up-effect"
          data-playing="true"
          data-enhanced="true"
          data-style="flourish"
          data-level="${controller.levelUp.level}"
          role="status"
          aria-label="Level up to ${controller.levelUp.level}"
        >Level ${controller.levelUp.level}</div>`);
      }
      return parts.join('');
    },
  };
  return controller;
}
