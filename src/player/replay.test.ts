import { describe, expect, it } from 'vitest';
import { createGame } from '../game/engine';
import { dispatchAction } from './controls';
import { createMemoryStore } from './persistence';
import {
  createReplayRecorder,
  hasLastReplay,
  loadLastReplay,
  playReplay,
  saveLastReplay,
} from './replay';

describe('TETR-64 Replay of last game', () => {
  it('TETR-64 The recorded input log is played back, reproducing the same piece sequence and outcomes as the original session', () => {
    const sequence = ['I', 'T', 'O', 'J', 'L', 'S', 'Z', 'I', 'T', 'O', 'J', 'L'] as const;
    const game = createGame({
      gravityMs: 1_000_000,
      dasMs: 1_000,
      arrMs: 1_000,
      pieceSequence: [...sequence],
    });
    const recorder = createReplayRecorder(game);

    const play = (action: Parameters<typeof dispatchAction>[1]) => {
      recorder.record('action', action);
      dispatchAction(game, action);
      game.update(16);
    };

    play('rotateCw');
    play('moveLeft');
    play('hardDrop');
    play('moveRight');
    play('hardDrop');

    while (!game.isOver()) {
      play('hardDrop');
      if (game.dealtPieces.length > 80) break;
    }

    expect(game.isOver()).toBe(true);
    const log = recorder.finalize();
    expect(log.events.length).toBeGreaterThan(0);
    expect(log.pieceSequence).toEqual(game.dealtPieces);
    expect(log.outcome).toEqual({ score: game.score, lines: game.lines, level: game.level });

    const store = createMemoryStore();
    saveLastReplay(store, log);
    expect(hasLastReplay(store)).toBe(true);
    expect(loadLastReplay(store)?.outcome.score).toBe(game.score);

    const playback = playReplay(loadLastReplay(store)!);
    let guard = 0;
    while (playback.playing && guard < 10_000) {
      playback.advance(16);
      guard += 1;
    }

    expect(playback.game.dealtPieces).toEqual(game.dealtPieces);
    expect(playback.game.score).toBe(game.score);
    expect(playback.game.lines).toBe(game.lines);
    expect(playback.game.level).toBe(game.level);
    expect(playback.game.isOver()).toBe(true);
    expect(playback.game.getGameOverReason()).toBe(game.getGameOverReason());
  });
});
