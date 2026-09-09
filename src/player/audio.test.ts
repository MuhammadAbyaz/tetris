import { describe, expect, it } from 'vitest';
import { createGame, VISIBLE_COLS, type Game } from '../game/engine';
import { attachGameAudio, createAudioController, SFX_EVENTS } from './audio';

function forceGameOver(game: Game): void {
  game.setActive('T', 4, 4, 0);
  for (let y = 18; y < 24; y += 1) {
    for (let x = 0; x < VISIBLE_COLS; x += 1) {
      if (x !== 9) game.occupy(x, y, 'I');
    }
  }
  game.hardDrop();
}

describe('TETR-51 Sound effects with mute toggle', () => {
  it('TETR-51 The corresponding sound effect plays', () => {
    const heard: string[] = [];
    const audio = createAudioController({ play: (event) => heard.push(event) });
    const game = createGame({
      gravityMs: 1_000_000,
      linesPerLevel: 1,
      pieceSequence: ['I', 'I', 'T', 'O'],
    });
    attachGameAudio(game, audio);

    game.setActive('T', 4, 10, 0);
    game.tryMove(-1, 0);
    expect(heard).toContain('move');

    game.rotateCw();
    expect(heard).toContain('rotate');

    for (let x = 0; x < 9; x += 1) game.occupy(x, 0, 'J');
    game.setActive('I', 7, 8, 1);
    game.hardDrop();
    expect(heard).toContain('lock');
    expect(heard).toContain('lineClear');
    expect(heard).toContain('levelUp');

    forceGameOver(game);
    expect(heard).toContain('gameOver');
    for (const event of SFX_EVENTS) {
      expect(heard).toContain(event);
    }
  });
});

describe('TETR-52 Sound effects with mute toggle', () => {
  it('TETR-52 No sound effect plays until mute is deactivated', () => {
    const heard: string[] = [];
    const audio = createAudioController({
      muted: true,
      play: (event) => heard.push(event),
    });
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['T', 'I', 'O'] });
    attachGameAudio(game, audio);

    game.setActive('T', 4, 10, 0);
    game.tryMove(-1, 0);
    game.rotateCw();
    game.hardDrop();
    expect(heard).toEqual([]);
    expect(audio.played).toEqual([]);

    audio.setMuted(false);
    game.tryMove(1, 0);
    expect(heard).toContain('move');
    expect(audio.play('rotate')).toBe(true);
    expect(heard).toContain('rotate');
  });
});
