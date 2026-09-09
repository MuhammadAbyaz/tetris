import {
  createGame,
  type Game,
  type GameOptions,
  type PieceType,
  type PlayMode,
} from '../game/engine';
import { dispatchAction, releaseAction, type GameAction } from './controls';
import type { KeyValueStore } from './persistence';

export const LAST_REPLAY_KEY = 'tetris.last-replay.v1';

export interface ReplayEvent {
  t: number;
  type: 'action' | 'release';
  action: GameAction;
}

export interface ReplayLog {
  version: 1;
  mode: PlayMode;
  pieceSequence: PieceType[];
  gravityMs: number;
  minGravityMs: number;
  linesPerLevel: number;
  dasMs: number;
  arrMs: number;
  softDropMs: number;
  nextQueueSize: number;
  lineTarget: number | null;
  timeLimitMs: number | null;
  noFail: boolean;
  lockDelayMs: number;
  lineClearAnimationMs: number;
  events: ReplayEvent[];
  outcome: { score: number; lines: number; level: number };
}

export interface ReplayRecorder {
  game: Game;
  record(type: ReplayEvent['type'], action: GameAction): void;
  finalize(): ReplayLog;
}

export interface ReplayPlayback {
  game: Game;
  log: ReplayLog;
  playing: boolean;
  advance(dtMs: number): void;
}

export function createReplayRecorder(game: Game): ReplayRecorder {
  const events: ReplayEvent[] = [];
  return {
    game,
    record(type, action) {
      events.push({ t: game.elapsedMs, type, action });
    },
    finalize() {
      return {
        version: 1,
        mode: game.mode,
        pieceSequence: [...game.dealtPieces],
        gravityMs: game.baseGravityMs,
        minGravityMs: game.minGravityMs,
        linesPerLevel: game.linesPerLevel,
        dasMs: game.dasMs,
        arrMs: game.arrMs,
        softDropMs: game.softDropMs,
        nextQueueSize: game.nextQueueSize,
        lineTarget: game.lineTarget,
        timeLimitMs: game.timeLimitMs,
        noFail: game.noFail,
        lockDelayMs: game.lockDelayMs,
        lineClearAnimationMs: game.lineClearAnimationMs,
        events: [...events],
        outcome: { score: game.score, lines: game.lines, level: game.level },
      };
    },
  };
}

export function replayGameOptions(log: ReplayLog): GameOptions {
  return {
    mode: log.mode,
    pieceSequence: [...log.pieceSequence],
    gravityMs: log.gravityMs,
    minGravityMs: log.minGravityMs,
    linesPerLevel: log.linesPerLevel,
    dasMs: log.dasMs,
    arrMs: log.arrMs,
    softDropMs: log.softDropMs,
    nextQueueSize: log.nextQueueSize,
    lineTarget: log.lineTarget,
    timeLimitMs: log.timeLimitMs,
    noFail: log.noFail,
    lockDelayMs: log.lockDelayMs,
    lineClearAnimationMs: log.lineClearAnimationMs,
  };
}

export function playReplay(log: ReplayLog): ReplayPlayback {
  const game = createGame(replayGameOptions(log));
  let index = 0;
  const apply = (event: ReplayEvent) => {
    if (event.type === 'release') releaseAction(game, event.action);
    else dispatchAction(game, event.action);
  };
  const playback: ReplayPlayback = {
    game,
    log,
    playing: true,
    advance(dtMs) {
      if (!playback.playing) return;
      let remaining = Math.max(0, dtMs);
      while (playback.playing && remaining >= 0) {
        const next = log.events[index];
        if (next && next.t <= game.elapsedMs) {
          apply(next);
          index += 1;
          continue;
        }
        if (game.isOver()) {
          playback.playing = false;
          break;
        }
        if (remaining === 0) break;
        const untilEvent = next ? Math.max(0, next.t - game.elapsedMs) : remaining;
        const step = Math.min(remaining, untilEvent || remaining);
        if (step <= 0) {
          if (next) {
            apply(next);
            index += 1;
            continue;
          }
          break;
        }
        game.update(step);
        remaining -= step;
        if (game.isOver() && index >= log.events.length) {
          playback.playing = false;
        }
      }
      while (index < log.events.length && log.events[index]!.t <= game.elapsedMs) {
        apply(log.events[index]!);
        index += 1;
      }
      if (game.isOver()) playback.playing = false;
    },
  };
  return playback;
}

export function saveLastReplay(store: KeyValueStore, log: ReplayLog): ReplayLog {
  store.setItem(LAST_REPLAY_KEY, JSON.stringify(log));
  return log;
}

export function loadLastReplay(store: KeyValueStore): ReplayLog | null {
  const raw = store.getItem(LAST_REPLAY_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ReplayLog;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.events)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasLastReplay(store: KeyValueStore): boolean {
  return loadLastReplay(store) !== null;
}
