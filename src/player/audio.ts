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
  play(event: SfxEvent): boolean;
  setMuted(muted: boolean): void;
  setVolume(volume: number): void;
  lastPlayed: SfxEvent | null;
  played: SfxEvent[];
}

export function createAudioController(
  options: {
    muted?: boolean;
    volume?: number;
    play?: SfxPlayer;
  } = {},
): AudioController {
  let muted = Boolean(options.muted);
  let volume = clamp01(options.volume ?? 0.7);
  const played: SfxEvent[] = [];
  const customPlay = options.play;

  const controller: AudioController = {
    get muted() {
      return muted;
    },
    get volume() {
      return volume;
    },
    lastPlayed: null,
    played,
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
    },
    setVolume(next) {
      volume = clamp01(next);
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
