import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatHistoryLabel } from '../src/commands/history.js';
import {
  limitHistory,
  readHistory,
  writeHistory,
  type HistoryEntry,
} from '../src/history/store.js';

function entry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    image: 'node:22',
    name: undefined,
    ports: [],
    volumes: [],
    envVars: [],
    interactive: true,
    detach: false,
    rm: true,
    command: undefined,
    runAt: new Date(2026, 7, 17, 21, 5).toISOString(),
    ...overrides,
  };
}

function tempFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'dockerx-history-'));
  const file = join(dir, 'history.json');
  return file;
}

describe('readHistory / writeHistory', () => {
  it('round-trips entries', () => {
    const file = tempFile();
    writeHistory(file, [entry(), entry({ image: 'alpine:3', runAt: '2026-08-18T08:00:00.000Z' })]);
    expect(readHistory(file)).toHaveLength(2);
    expect(readHistory(file)[0]).toMatchObject({ image: 'node:22' });
  });

  it('returns an empty list for a missing or malformed file', () => {
    expect(readHistory('/nonexistent/history.json')).toEqual([]);
    const file = tempFile();
    writeFileSync(file, 'not json');
    expect(readHistory(file)).toEqual([]);
  });

  it('returns an empty list when the content is not an array', () => {
    const file = tempFile();
    writeFileSync(file, '{"foo":"bar"}');
    expect(readHistory(file)).toEqual([]);
  });

  it('creates the parent directory on write', () => {
    const file = tempFile();
    const nested = join(file, '..', 'sub', 'history.json');
    writeHistory(nested, [entry()]);
    expect(readHistory(nested)).toHaveLength(1);
    rmSync(join(nested, '..'), { recursive: true, force: true });
  });
});

describe('limitHistory', () => {
  it('caps the number of entries', () => {
    const entries = [entry(), entry(), entry()];
    expect(limitHistory(entries, 2)).toHaveLength(2);
  });

  it('keeps the most recent entries first', () => {
    const entries = [
      entry({ image: 'new' }),
      entry({ image: 'old' }),
      entry({ image: 'older' }),
    ];
    expect(limitHistory(entries, 2).map((e) => e.image)).toEqual(['new', 'old']);
  });
});

describe('formatHistoryLabel', () => {
  it('formats the date, image, name and flags', () => {
    expect(
      formatHistoryLabel(
        entry({ name: 'my-app', interactive: false, detach: true, command: 'npm start', runAt: new Date(2026, 7, 17, 21, 5).toISOString() }),
      ),
    ).toBe('17/08 21:05 · node:22 · my-app · --detach');
  });

  it('shows the -it flag for interactive runs', () => {
    expect(formatHistoryLabel(entry({ interactive: true, runAt: new Date(2026, 7, 17, 9, 30).toISOString() }))).toBe(
      '17/08 09:30 · node:22 · -it',
    );
  });

  it('omits optional fields when absent', () => {
    expect(formatHistoryLabel(entry({ runAt: new Date(2026, 7, 17, 9, 30).toISOString() }))).toBe('17/08 09:30 · node:22 · -it');
  });

  it('marks entries that failed to launch', () => {
    expect(
      formatHistoryLabel(entry({ failed: true, runAt: new Date(2026, 7, 17, 21, 5).toISOString() })),
    ).toBe('17/08 21:05 · node:22 · -it · failed');
  });
});