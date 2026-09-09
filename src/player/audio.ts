import type { Game, GameCue } from '../game/engine';

export type SfxEvent = GameCue;

export const SFX_EVENTS: SfxEvent[] = [
  'move',
  'rotate',
  'lock',
  'lineClear',
  'levelUp',
  'gameOver',
];

export type SfxPlayer = (event: SfxEvent, volume: number) => void;
export type MusicPlayer = (trackId: string, volume: number) => void;

export const MUSIC_TRACKS = [
  { id: 'pulse', name: 'Pulse' },
  { id: 'arcade', name: 'Arcade' },
  { id: 'calm', name: 'Calm' },
] as const;

export type MusicTrackId = (typeof MUSIC_TRACKS)[number]['id'];
export const DEFAULT_MUSIC_TRACK: MusicTrackId = 'pulse';

export function isMusicTrackId(value: string): value is MusicTrackId {
  return MUSIC_TRACKS.some((track) => track.id === value);
}

const TONES: Record<SfxEvent, { freq: number; duration: number }> = {
  move: { freq: 240, duration: 0.04 },
  rotate: { freq: 360, duration: 0.05 },
  lock: { freq: 140, duration: 0.08 },
  lineClear: { freq: 520, duration: 0.16 },
  levelUp: { freq: 660, duration: 0.2 },
  gameOver: { freq: 90, duration: 0.35 },
};

export interface AudioController {
  muted: boolean;
  volume: number;
  musicEnabled: boolean;
  currentTrack: MusicTrackId;
  musicPlaying: boolean;
  play(event: SfxEvent): boolean;
  setMuted(muted: boolean): void;
  setVolume(volume: number): void;
  setMusicEnabled(enabled: boolean): void;
  setTrack(trackId: string): void;
  startGameplayMusic(): boolean;
  stopGameplayMusic(): void;
  selectTrack(trackId: string): boolean;
  lastPlayed: SfxEvent | null;
  played: SfxEvent[];
  playedTracks: string[];
  lastMusicAction: 'play' | 'switch' | 'stop' | null;
}

export function createAudioController(
  options: {
    muted?: boolean;
    volume?: number;
    play?: SfxPlayer;
    musicEnabled?: boolean;
    track?: string;
    playTrack?: MusicPlayer;
  } = {},
): AudioController {
  let muted = Boolean(options.muted);
  let volume = clamp01(options.volume ?? 0.7);
  let musicEnabled = options.musicEnabled ?? true;
  const initialTrack = options.track ?? '';
  let currentTrack: MusicTrackId = isMusicTrackId(initialTrack)
    ? initialTrack
    : DEFAULT_MUSIC_TRACK;
  let musicPlaying = false;
  const played: SfxEvent[] = [];
  const playedTracks: string[] = [];
  const customPlay = options.play;
  const customPlayTrack = options.playTrack;

  const canPlayMusic = () => musicEnabled && !muted && volume > 0;

  const beginTrack = (reason: 'play' | 'switch'): boolean => {
    if (!canPlayMusic()) {
      musicPlaying = false;
      return false;
    }
    musicPlaying = true;
    playedTracks.push(currentTrack);
    controller.lastMusicAction = reason;
    if (customPlayTrack) customPlayTrack(currentTrack, volume);
    else playBrowserDrone(currentTrack, volume);
    return true;
  };

  const controller: AudioController = {
    get muted() {
      return muted;
    },
    get volume() {
      return volume;
    },
    get musicEnabled() {
      return musicEnabled;
    },
    get currentTrack() {
      return currentTrack;
    },
    get musicPlaying() {
      return musicPlaying;
    },
    lastPlayed: null,
    lastMusicAction: null,
    played,
    playedTracks,
    play(event) {
      if (muted || volume <= 0) return false;
      played.push(event);
      controller.lastPlayed = event;
      if (customPlay) customPlay(event, volume);
      else playBrowserTone(event, volume);
      return true;
    },
    setMuted(next) {
      muted = Boolean(next);
      if (muted) {
        musicPlaying = false;
        controller.lastMusicAction = 'stop';
      }
    },
    setVolume(next) {
      volume = clamp01(next);
    },
    setMusicEnabled(enabled) {
      musicEnabled = Boolean(enabled);
      if (!musicEnabled && musicPlaying) {
        musicPlaying = false;
        controller.lastMusicAction = 'stop';
      }
    },
    setTrack(trackId) {
      currentTrack = isMusicTrackId(trackId) ? trackId : DEFAULT_MUSIC_TRACK;
    },
    startGameplayMusic() {
      return beginTrack('play');
    },
    stopGameplayMusic() {
      if (!musicPlaying) return;
      musicPlaying = false;
      controller.lastMusicAction = 'stop';
    },
    selectTrack(trackId) {
      const next = isMusicTrackId(trackId) ? trackId : DEFAULT_MUSIC_TRACK;
      const switching = musicPlaying && next !== currentTrack;
      currentTrack = next;
      if (!canPlayMusic()) return false;
      return beginTrack(switching ? 'switch' : 'play');
    },
  };

  return controller;
}

export function attachGameAudio(game: Game, audio: AudioController): () => void {
  return game.onCue((cue) => {
    audio.play(cue);
  });
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.7;
  return Math.min(1, Math.max(0, value));
}

function playBrowserDrone(trackId: string, volume: number): void {
  const freqs: Record<string, number> = { pulse: 196, arcade: 262, calm: 174 };
  playBrowserToneLike(freqs[trackId] ?? 196, volume * 0.03, 0.4, 'sine');
}

function playBrowserToneLike(
  freq: number,
  gainValue: number,
  duration: number,
  type: OscillatorType,
): void {
  const AudioCtx =
    typeof window !== 'undefined'
      ? window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = freq;
    gain.gain.value = gainValue;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
    oscillator.onended = () => {
      void ctx.close();
    };
  } catch {
    /* audio is optional in headless environments */
  }
}

function playBrowserTone(event: SfxEvent, volume: number): void {
  const AudioCtx =
    typeof window !== 'undefined'
      ? window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    const tone = TONES[event];
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = event === 'gameOver' ? 'sawtooth' : 'square';
    oscillator.frequency.value = tone.freq;
    gain.gain.value = volume * 0.08;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + tone.duration);
    oscillator.onended = () => {
      void ctx.close();
    };
  } catch {
    /* audio is optional in headless environments */
  }
}
