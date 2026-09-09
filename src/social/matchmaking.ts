import type { GameBackend, MatchTicket } from './backend';
import { createVersusSession, garbageLinesForClears, VersusSession } from './versus';

export function requestOnlineMatch(backend: GameBackend, playerId: string): MatchTicket {
  return backend.requestMatch(playerId);
}

export function usesLocalVersusGarbage(session: VersusSession): boolean {
  return session.kind === 'online' && garbageLinesForClears(4) === 4;
}

export function startLocalVersus(): VersusSession {
  return createVersusSession('local', { holeColumn: 4 });
}
