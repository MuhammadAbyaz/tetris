import { createGame, createSevenBag, Game, type PieceType } from '../game/engine';

export function dailyDateKey(date: string | Date): string {
  if (typeof date === 'string') return date.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function generateDailySequence(date: string | Date, count = 21): PieceType[] {
  const bag = createSevenBag(seededRng(hashSeed(`daily-challenge:${dailyDateKey(date)}`)));
  return Array.from({ length: count }, () => bag.next());
}

export function startDailyChallenge(date: string | Date): Game {
  return createGame({
    pieceSequence: generateDailySequence(date, 70),
    gravityMs: 800,
    nextQueueSize: 5,
  });
}

export function dailyPieceSequence(game: Game, count = 14): PieceType[] {
  const pieces: PieceType[] = [];
  if (game.active) pieces.push(game.active.type);
  pieces.push(...game.getNextQueue());
  return pieces.slice(0, count);
}
