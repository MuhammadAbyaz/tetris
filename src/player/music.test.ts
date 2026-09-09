import { describe, expect, it } from 'vitest';
import { createAudioController, MUSIC_TRACKS } from './audio';

describe('TETR-57 Background music with track selection', () => {
  it('TETR-57 A background music track plays', () => {
    const heard: string[] = [];
    const audio = createAudioController({
      musicEnabled: true,
      playTrack: (track) => heard.push(track),
    });

    expect(audio.musicEnabled).toBe(true);
    expect(MUSIC_TRACKS.length).toBeGreaterThan(1);
    const started = audio.startGameplayMusic();

    expect(started).toBe(true);
    expect(audio.musicPlaying).toBe(true);
    expect(audio.lastMusicAction).toBe('play');
    expect(heard).toContain(audio.currentTrack);
    expect(audio.playedTracks).toContain(audio.currentTrack);
  });
});

describe('TETR-58 Background music with track selection', () => {
  it('TETR-58 Playback switches to the selected track', () => {
    const heard: string[] = [];
    const audio = createAudioController({
      musicEnabled: true,
      track: 'pulse',
      playTrack: (track) => heard.push(track),
    });
    audio.startGameplayMusic();
    expect(audio.currentTrack).toBe('pulse');
    expect(heard).toEqual(['pulse']);

    const switched = audio.selectTrack('arcade');
    expect(switched).toBe(true);
    expect(audio.currentTrack).toBe('arcade');
    expect(audio.lastMusicAction).toBe('switch');
    expect(heard).toEqual(['pulse', 'arcade']);
    expect(audio.playedTracks.at(-1)).toBe('arcade');
  });
});
