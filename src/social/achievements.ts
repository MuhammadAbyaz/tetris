import type { Game, LockResult } from '../game/engine';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
}

export interface UnlockedAchievement extends AchievementDef {
  unlockedAt: string;
  shown: true;
}

export const ACHIEVEMENTS: Record<string, AchievementDef> = {
  first_tetris: {
    id: 'first_tetris',
    title: 'First Tetris',
    description: 'Clear four lines at once for the first time',
  },
};

export class AchievementTracker {
  readonly unlocked = new Map<string, UnlockedAchievement>();
  readonly shownToPlayer: UnlockedAchievement[] = [];

  detect(feat: { type: 'line_clear'; linesCleared: number }): UnlockedAchievement | null {
    if (feat.linesCleared === 4) {
      return this.unlock('first_tetris');
    }
    return null;
  }

  attach(game: Game): () => void {
    return game.onLock((result: LockResult) => {
      this.detect({ type: 'line_clear', linesCleared: result.linesCleared });
    });
  }

  private unlock(id: string): UnlockedAchievement | null {
    if (this.unlocked.has(id)) return null;
    const def = ACHIEVEMENTS[id];
    if (!def) return null;
    const unlocked: UnlockedAchievement = {
      ...def,
      unlockedAt: new Date().toISOString(),
      shown: true,
    };
    this.unlocked.set(id, unlocked);
    this.shownToPlayer.push(unlocked);
    return unlocked;
  }
}

export function createAchievementTracker(): AchievementTracker {
  return new AchievementTracker();
}
