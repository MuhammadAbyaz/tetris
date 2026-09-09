import { createVersusSession, VersusSession } from './versus';

export interface CloudSave {
  settings: {
    dasMs: number;
    arrMs: number;
  };
  progress: {
    highScore: number;
    gamesPlayed: number;
    unlockedAchievementIds: string[];
  };
}

export interface AccountRecord {
  id: string;
  username: string;
  password: string;
  cloudSave: CloudSave;
}

export interface SessionRecord {
  token: string;
  userId: string;
}

export interface LeaderboardEntry {
  id: string;
  playerId: string;
  displayName: string;
  mode: string;
  score: number;
  submittedAt: string;
}

export interface MatchTicket {
  playerId: string;
  status: 'queued' | 'matched';
  session: VersusSession | null;
}

export interface SpectatorSeat {
  spectatorId: string;
  matchId: string;
  canControl: false;
}

const EMPTY_SAVE: CloudSave = {
  settings: { dasMs: 167, arrMs: 33 },
  progress: { highScore: 0, gamesPlayed: 0, unlockedAchievementIds: [] },
};

export class GameBackend {
  private users = new Map<string, AccountRecord>();
  private sessions = new Map<string, SessionRecord>();
  private scores: LeaderboardEntry[] = [];
  private matches = new Map<string, VersusSession>();
  private spectators = new Map<string, SpectatorSeat[]>();
  private waiting: MatchTicket | null = null;

  register(username: string, password: string): AccountRecord {
    const key = username.trim().toLowerCase();
    if (!key || !password) {
      throw new Error('Username and password are required');
    }
    if (this.users.has(key)) {
      throw new Error('Username already taken');
    }
    const account: AccountRecord = {
      id: `user-${this.users.size + 1}`,
      username: username.trim(),
      password,
      cloudSave: structuredClone(EMPTY_SAVE),
    };
    this.users.set(key, account);
    return account;
  }

  login(username: string, password: string): SessionRecord {
    const account = this.users.get(username.trim().toLowerCase());
    if (!account || account.password !== password) {
      throw new Error('Invalid credentials');
    }
    const session: SessionRecord = {
      token: `sess-${account.id}-${Math.random().toString(36).slice(2, 10)}`,
      userId: account.id,
    };
    this.sessions.set(session.token, session);
    return session;
  }

  saveCloud(token: string, save: CloudSave): CloudSave {
    const account = this.requireAccount(token);
    account.cloudSave = structuredClone(save);
    return structuredClone(account.cloudSave);
  }

  loadCloud(token: string): CloudSave {
    return structuredClone(this.requireAccount(token).cloudSave);
  }

  submitScore(input: {
    playerId: string;
    displayName: string;
    mode: string;
    score: number;
  }): LeaderboardEntry {
    const entry: LeaderboardEntry = {
      id: `score-${this.scores.length + 1}`,
      playerId: input.playerId,
      displayName: input.displayName,
      mode: input.mode,
      score: input.score,
      submittedAt: new Date().toISOString(),
    };
    this.scores.push(entry);
    return entry;
  }

  getLeaderboard(mode: string): LeaderboardEntry[] {
    return this.scores
      .filter((entry) => entry.mode === mode)
      .slice()
      .sort((a, b) => b.score - a.score || a.submittedAt.localeCompare(b.submittedAt));
  }

  requestMatch(playerId: string): MatchTicket {
    if (this.waiting && this.waiting.playerId !== playerId) {
      const session = createVersusSession('online', {
        id: `online-${playerId}-${this.waiting.playerId}`,
        holeColumn: 4,
      });
      this.matches.set(session.id, session);
      this.spectators.set(session.id, []);
      this.waiting.status = 'matched';
      this.waiting.session = session;
      const ticket: MatchTicket = { playerId, status: 'matched', session };
      this.waiting = null;
      return ticket;
    }
    const ticket: MatchTicket = { playerId, status: 'queued', session: null };
    this.waiting = ticket;
    return ticket;
  }

  getMatch(matchId: string): VersusSession | null {
    return this.matches.get(matchId) ?? null;
  }

  listMatches(): VersusSession[] {
    return [...this.matches.values()];
  }

  joinSpectator(matchId: string, spectatorId: string): SpectatorSeat {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new Error('Match not found');
    }
    const seat: SpectatorSeat = { spectatorId, matchId, canControl: false };
    const seats = this.spectators.get(matchId) ?? [];
    seats.push(seat);
    this.spectators.set(matchId, seats);
    return seat;
  }

  listSpectators(matchId: string): SpectatorSeat[] {
    return [...(this.spectators.get(matchId) ?? [])];
  }

  private requireAccount(token: string): AccountRecord {
    const session = this.sessions.get(token);
    if (!session) {
      throw new Error('Not signed in');
    }
    for (const account of this.users.values()) {
      if (account.id === session.userId) return account;
    }
    throw new Error('Account missing');
  }
}

export function createBackend(): GameBackend {
  return new GameBackend();
}
