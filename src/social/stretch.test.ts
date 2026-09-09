import { describe, expect, it } from 'vitest';
import { createGame, VISIBLE_COLS, type Game } from '../game/engine';
import { createAccountClient } from './accounts';
import { createAchievementTracker } from './achievements';
import { createBackend } from './backend';
import { dailyPieceSequence, generateDailySequence, startDailyChallenge } from './daily';
import { getGlobalLeaderboard, submitScore } from './leaderboard';
import { requestOnlineMatch, usesLocalVersusGarbage } from './matchmaking';
import { joinSpectator } from './spectator';
import { countGarbageRows, createVersusSession, garbageLinesForClears } from './versus';
import { createReplayRecorder } from '../player/replay';

function setupTetrisReady(game: Game, holeX = 9): void {
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < VISIBLE_COLS; x += 1) {
      if (x !== holeX) game.occupy(x, y, 'J');
    }
  }
  game.setActive('I', holeX - 2, 8, 1);
}

describe('TETR-68 Online multiplayer/versus with matchmaking', () => {
  it('TETR-68 An online Versus session starts using the same garbage-line mechanics as local Versus mode', () => {
    const backend = createBackend();
    const queued = requestOnlineMatch(backend, 'alice');
    expect(queued.status).toBe('queued');
    expect(queued.session).toBeNull();

    const matched = requestOnlineMatch(backend, 'bob');
    expect(matched.status).toBe('matched');
    expect(queued.status).toBe('matched');
    expect(matched.session).not.toBeNull();
    expect(queued.session).toBe(matched.session);

    const online = matched.session!;
    expect(online.kind).toBe('online');
    expect(usesLocalVersusGarbage(online)).toBe(true);

    const local = createVersusSession('local', { holeColumn: 4 });
    expect(garbageLinesForClears(4)).toBe(4);
    expect(garbageLinesForClears(2)).toBe(1);

    setupTetrisReady(online.player1);
    online.player1.hardDrop();
    setupTetrisReady(local.player1);
    local.player1.hardDrop();

    expect(online.player1.lastLock?.isTetris).toBe(true);
    expect(local.player1.lastLock?.isTetris).toBe(true);
    expect(countGarbageRows(online.player2)).toBe(garbageLinesForClears(4));
    expect(countGarbageRows(local.player2)).toBe(countGarbageRows(online.player2));
    expect(online.sentGarbage[0]).toBe(local.sentGarbage[0]);
  });
});

describe('TETR-69 Global leaderboards (backend-persisted)', () => {
  it('TETR-69 It is persisted to the backend and appears on the global leaderboard for that mode', () => {
    const backend = createBackend();
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['T', 'I'] });
    const recorder = createReplayRecorder(game);
    recorder.record('action', 'hardDrop');
    game.hardDrop();
    const replay = recorder.finalize();

    const submitted = submitScore(backend, {
      playerId: 'player-1',
      displayName: 'Ada',
      mode: 'marathon',
      score: game.score,
      replay,
    });

    const board = getGlobalLeaderboard(backend, 'marathon');
    expect(board).toHaveLength(1);
    expect(board[0]).toMatchObject({
      id: submitted.id,
      playerId: 'player-1',
      mode: 'marathon',
      score: game.score,
    });
    expect(getGlobalLeaderboard(backend, 'daily')).toEqual([]);
  });
});

describe('TETR-70 User accounts and cloud save', () => {
  it('TETR-70 Their saved settings and progress are available on that device', () => {
    const backend = createBackend();
    const deviceA = createAccountClient(backend);
    deviceA.registerAndSignIn('sam', 'secret');
    const saved = deviceA.saveCloud({
      settings: { dasMs: 90, arrMs: 10 },
      progress: { highScore: 5400, gamesPlayed: 7, unlockedAchievementIds: ['first_tetris'] },
    });

    const deviceB = createAccountClient(backend);
    deviceB.login('sam', 'secret');
    expect(deviceB.loadCloud()).toEqual(saved);
    expect(deviceB.loadCloud().settings.dasMs).toBe(90);
    expect(deviceB.loadCloud().progress.highScore).toBe(5400);
  });
});

describe('TETR-71 Spectator mode', () => {
  it('TETR-71 They can view the live board state of the match without being able to control any player piece', () => {
    const backend = createBackend();
    requestOnlineMatch(backend, 'alice');
    const match = requestOnlineMatch(backend, 'bob').session!;
    match.player1.setActive('T', 5, 12, 0);

    const spectator = joinSpectator(backend, match, 'viewer-1');
    expect(spectator.canControl).toBe(false);
    expect(spectator.seat.canControl).toBe(false);

    const before = spectator.getLiveState();
    expect(before.player1.active?.x).toBe(5);
    expect(before.player2.board).toHaveLength(match.player2.board.length);

    const moved = match.player1.tryMove(-1, 0);
    expect(moved).toBe(true);
    const after = spectator.getLiveState();
    expect(after.player1.active?.x).toBe(4);

    const blocked = spectator.tryControl('left');
    expect(blocked.accepted).toBe(false);
    expect(match.player1.active?.x).toBe(4);
    expect(match.player2.tryMove).toBeTypeOf('function');
  });
});

describe('TETR-72 Daily challenge / seeded puzzle mode', () => {
  it('TETR-72 They all receive the identical seeded piece sequence', () => {
    const date = '2026-09-09';
    const playerA = startDailyChallenge(date);
    const playerB = startDailyChallenge(date);
    const otherDay = startDailyChallenge('2026-09-10');

    const sequenceA = generateDailySequence(date, 14);
    const sequenceB = generateDailySequence(date, 14);
    const sequenceC = generateDailySequence('2026-09-10', 14);

    expect(sequenceA).toHaveLength(14);
    expect(sequenceA).toEqual(sequenceB);
    expect(sequenceA).not.toEqual(sequenceC);
    expect(dailyPieceSequence(playerA, 6)).toEqual(dailyPieceSequence(playerB, 6));
    expect(dailyPieceSequence(playerA, 6)).toEqual(sequenceA.slice(0, 6));
    expect(dailyPieceSequence(otherDay, 6)).toEqual(sequenceC.slice(0, 6));
  });
});

describe('TETR-73 Achievements system', () => {
  it('TETR-73 The corresponding achievement is unlocked and shown to the player', () => {
    const game = createGame({ gravityMs: 1_000_000, pieceSequence: ['I', 'T'] });
    const tracker = createAchievementTracker();
    tracker.attach(game);

    setupTetrisReady(game);
    game.hardDrop();

    expect(game.lastLock?.isTetris).toBe(true);
    const unlocked = tracker.unlocked.get('first_tetris');
    expect(unlocked).toBeDefined();
    expect(unlocked?.shown).toBe(true);
    expect(tracker.shownToPlayer).toHaveLength(1);
    expect(tracker.shownToPlayer[0]).toMatchObject({
      id: 'first_tetris',
      title: 'First Tetris',
      shown: true,
    });
  });
});
