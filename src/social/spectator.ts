import type { GameBackend, SpectatorSeat } from './backend';
import type { VersusSession } from './versus';
import type { ActivePiece, LockedCell } from '../game/engine';

export interface LiveBoardState {
  board: (LockedCell | null)[][];
  active: ActivePiece | null;
  score: number;
}

export interface SpectatorView {
  seat: SpectatorSeat;
  canControl: false;
  getLiveState(): { player1: LiveBoardState; player2: LiveBoardState };
  tryControl(action: 'left' | 'right' | 'rotate' | 'drop'): { accepted: false; reason: string };
}

export function joinSpectator(
  backend: GameBackend,
  match: VersusSession,
  spectatorId: string,
): SpectatorView {
  const seat = backend.joinSpectator(match.id, spectatorId);
  return {
    seat,
    canControl: false,
    getLiveState() {
      return {
        player1: {
          board: match.snapshot(0),
          active: match.player1.active ? { ...match.player1.active } : null,
          score: match.player1.score,
        },
        player2: {
          board: match.snapshot(1),
          active: match.player2.active ? { ...match.player2.active } : null,
          score: match.player2.score,
        },
      };
    },
    tryControl() {
      return { accepted: false, reason: 'Spectators cannot control any player piece' };
    },
  };
}
