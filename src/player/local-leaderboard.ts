import type { PlayMode } from '../game/engine';
import type { KeyValueStore } from './persistence';

export const LOCAL_LEADERBOARD_KEY = 'tetris.local-leaderboard.v1';
export const LOCAL_LEADERBOARD_LIMIT = 10;
export const LOCAL_LEADERBOARD_MODES = [
  'marathon',
  'sprint',
  'ultra',
  'zen',
  'versus',
  'daily',
] as const;

export type LocalBoardMode = (typeof LOCAL_LEADERBOARD_MODES)[number] | string;

export interface LocalRecord {
  id: string;
  mode: string;
  score: number;
  lines: number;
  level: number;
  elapsedMs: number;
  at: number;
}

export interface LocalRecordInput {
  mode: PlayMode | string;
  score: number;
  lines: number;
  level: number;
  elapsedMs: number;
  at?: number;
}

function emptyBoards(): Record<string, LocalRecord[]> {
  const boards: Record<string, LocalRecord[]> = {};
  for (const mode of LOCAL_LEADERBOARD_MODES) boards[mode] = [];
  return boards;
}

function loadBoards(store: KeyValueStore): Record<string, LocalRecord[]> {
  const raw = store.getItem(LOCAL_LEADERBOARD_KEY);
  if (!raw) return emptyBoards();
  try {
    const parsed = JSON.parse(raw) as Record<string, LocalRecord[]>;
    const boards = emptyBoards();
    for (const [mode, rows] of Object.entries(parsed ?? {})) {
      if (!Array.isArray(rows)) continue;
      boards[mode] = rows
        .filter((row) => row && typeof row.score === 'number')
        .map((row) => ({
          id: String(row.id),
          mode: String(row.mode ?? mode),
          score: Math.max(0, Math.floor(row.score)),
          lines: Math.max(0, Math.floor(Number(row.lines) || 0)),
          level: Math.max(1, Math.floor(Number(row.level) || 1)),
          elapsedMs: Math.max(0, Math.floor(Number(row.elapsedMs) || 0)),
          at: Number(row.at) || 0,
        }));
    }
    return boards;
  } catch {
    return emptyBoards();
  }
}

function saveBoards(store: KeyValueStore, boards: Record<string, LocalRecord[]>): void {
  store.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(boards));
}

function sortRecords(mode: string, rows: LocalRecord[]): LocalRecord[] {
  const copy = [...rows];
  if (mode === 'sprint') {
    copy.sort((a, b) => a.elapsedMs - b.elapsedMs || b.score - a.score);
  } else {
    copy.sort((a, b) => b.score - a.score || a.elapsedMs - b.elapsedMs);
  }
  return copy;
}

function qualifies(mode: string, rows: LocalRecord[], candidate: LocalRecord): boolean {
  if (rows.length < LOCAL_LEADERBOARD_LIMIT) return true;
  const ranked = sortRecords(mode, [...rows, candidate]);
  return ranked.slice(0, LOCAL_LEADERBOARD_LIMIT).some((row) => row.id === candidate.id);
}

export function submitLocalRecord(
  store: KeyValueStore,
  input: LocalRecordInput,
): LocalRecord | null {
  const mode = String(input.mode || 'marathon');
  const boards = loadBoards(store);
  const current = boards[mode] ?? [];
  const record: LocalRecord = {
    id: `local-${mode}-${input.at ?? Date.now()}-${Math.max(0, Math.floor(input.score))}`,
    mode,
    score: Math.max(0, Math.floor(input.score)),
    lines: Math.max(0, Math.floor(input.lines)),
    level: Math.max(1, Math.floor(input.level)),
    elapsedMs: Math.max(0, Math.floor(input.elapsedMs)),
    at: input.at ?? Date.now(),
  };
  if (!qualifies(mode, current, record)) return null;
  boards[mode] = sortRecords(mode, [...current, record]).slice(0, LOCAL_LEADERBOARD_LIMIT);
  saveBoards(store, boards);
  return record;
}

export function getLocalRecords(store: KeyValueStore, mode?: string): LocalRecord[] {
  const boards = loadBoards(store);
  if (mode && mode !== 'all') return sortRecords(mode, boards[mode] ?? []);
  return Object.keys(boards)
    .flatMap((key) => sortRecords(key, boards[key] ?? []))
    .sort((a, b) => b.score - a.score);
}

export function getLocalRecordsByMode(store: KeyValueStore): Record<string, LocalRecord[]> {
  const boards = loadBoards(store);
  const grouped: Record<string, LocalRecord[]> = {};
  for (const [mode, rows] of Object.entries(boards)) {
    grouped[mode] = sortRecords(mode, rows);
  }
  return grouped;
}

export function renderLocalLeaderboard(store: KeyValueStore, filter: string = 'all'): string {
  const grouped = getLocalRecordsByMode(store);
  const modes = Object.keys(grouped).filter(
    (mode) =>
      grouped[mode]!.length > 0 ||
      LOCAL_LEADERBOARD_MODES.includes(mode as (typeof LOCAL_LEADERBOARD_MODES)[number]),
  );
  const visible = filter === 'all' ? modes : [filter];
  const groups = visible
    .map((mode) => {
      const rows = grouped[mode] ?? [];
      const body =
        rows.length === 0
          ? `<tr><td colspan="5">No local records yet</td></tr>`
          : rows
              .map(
                (row, index) =>
                  `<tr data-testid="local-record" data-mode="${escapeHtml(row.mode)}">
                    <td>${index + 1}</td>
                    <td>${row.score}</td>
                    <td>${row.lines}</td>
                    <td>${row.level}</td>
                    <td>${formatMs(row.elapsedMs)}</td>
                  </tr>`,
              )
              .join('');
      return `<section class="leaderboard-group" data-testid="leaderboard-group-${escapeHtml(mode)}" data-mode="${escapeHtml(mode)}">
        <h2>${escapeHtml(labelForMode(mode))}</h2>
        <table>
          <thead><tr><th>#</th><th>Score</th><th>Lines</th><th>Level</th><th>Time</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </section>`;
    })
    .join('');

  const options = [`<option value="all"${filter === 'all' ? ' selected' : ''}>All modes</option>`]
    .concat(
      LOCAL_LEADERBOARD_MODES.map(
        (mode) =>
          `<option value="${mode}"${filter === mode ? ' selected' : ''}>${labelForMode(mode)}</option>`,
      ),
    )
    .join('');

  return `
    <section class="panel wide" data-testid="local-leaderboard" data-filter="${escapeHtml(filter)}">
      <h1>Local leaderboard</h1>
      <label>Game mode
        <select data-testid="leaderboard-mode-filter" aria-label="Filter local records by game mode">
          ${options}
        </select>
      </label>
      <div class="leaderboard-groups" data-testid="leaderboard-groups" data-grouped="${filter === 'all' ? 'true' : 'false'}">
        ${groups}
      </div>
    </section>`;
}

function labelForMode(mode: string): string {
  const labels: Record<string, string> = {
    marathon: 'Marathon',
    sprint: 'Sprint',
    ultra: 'Ultra',
    zen: 'Zen',
    versus: 'Versus',
    daily: 'Daily',
  };
  return labels[mode] ?? mode;
}

function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
}
