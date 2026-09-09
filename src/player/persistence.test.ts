import { describe, expect, it } from 'vitest';
import {
  createMemoryStore,
  createPlayerSession,
  loadPlayerState,
  recordHighScore,
  saveSettings,
} from './index';

describe('TETR-45 Local persistence of high scores and settings', () => {
  it('TETR-45 The high score is still displayed, retrieved from local storage', () => {
    const store = createMemoryStore();
    const session = createPlayerSession({ store });
    session.persistScore(12_400);

    const afterClose = loadPlayerState(store);
    expect(afterClose.highScore).toBe(12_400);

    const reopened = session.reopen();
    expect(reopened.highScore).toBe(12_400);
    expect(recordHighScore(store, 3_000)).toBe(12_400);
  });
});

describe('TETR-46 Local persistence of high scores and settings', () => {
  it('TETR-46 The changed setting value persists', () => {
    const store = createMemoryStore();
    const session = createPlayerSession({ store });
    session.openSettings();
    session.changeDraft({ volume: 0.25, muted: true, dasMs: 90, arrMs: 12 });
    session.captureBinding('hardDrop', 'p');
    session.closeSettings();

    const persisted = loadPlayerState(store);
    expect(persisted.settings.volume).toBe(0.25);
    expect(persisted.settings.muted).toBe(true);
    expect(persisted.settings.dasMs).toBe(90);
    expect(persisted.settings.arrMs).toBe(12);
    expect(persisted.settings.bindings.hardDrop).toEqual(['p']);

    const reopened = session.reopen();
    expect(reopened.settings.volume).toBe(0.25);
    expect(reopened.settings.muted).toBe(true);
    expect(reopened.settings.dasMs).toBe(90);
    expect(reopened.settings.arrMs).toBe(12);
    expect(reopened.settings.bindings.hardDrop).toEqual(['p']);
    expect(reopened.game.dasMs).toBe(90);
    expect(reopened.game.arrMs).toBe(12);
    expect(reopened.audio.muted).toBe(true);
    expect(reopened.audio.volume).toBe(0.25);

    const viaHelper = saveSettings(store, reopened.settings);
    expect(viaHelper.dasMs).toBe(90);
  });
});
