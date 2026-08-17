import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { RunOptions } from '../types/run-options.js';

export interface HistoryEntry extends RunOptions {
  runAt: string;
}

export const MAX_HISTORY_ENTRIES = 20;

export function historyFilePath(): string {
  return join(homedir(), '.config', 'dockerx', 'history.json');
}

export function readHistory(file: string): HistoryEntry[] {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function writeHistory(file: string, entries: HistoryEntry[]): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(entries, null, 2)}\n`);
}

export function limitHistory(entries: HistoryEntry[], max: number): HistoryEntry[] {
  return entries.slice(0, max);
}

export function loadHistory(): HistoryEntry[] {
  return readHistory(historyFilePath());
}

export function addHistoryEntry(options: RunOptions): void {
  const entry: HistoryEntry = { ...options, runAt: new Date().toISOString() };
  writeHistory(historyFilePath(), limitHistory([entry, ...loadHistory()], MAX_HISTORY_ENTRIES));
}

export function clearHistory(): void {
  writeHistory(historyFilePath(), []);
}