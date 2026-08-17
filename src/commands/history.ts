import {
  clearHistory,
  loadHistory,
  type HistoryEntry,
} from '../history/store.js';
import { executeRun, runInteractive } from './run.js';
import { style } from '../tui/render.js';
import { select } from '../tui/select.js';

export function formatHistoryLabel(entry: HistoryEntry): string {
  const when = new Date(entry.runAt);
  const dd = String(when.getDate()).padStart(2, '0');
  const mm = String(when.getMonth() + 1).padStart(2, '0');
  const hh = String(when.getHours()).padStart(2, '0');
  const min = String(when.getMinutes()).padStart(2, '0');
  const flags = [entry.detach && '--detach', entry.interactive && '-it']
    .filter(Boolean)
    .join(' ');
  return `${dd}/${mm} ${hh}:${min} · ${entry.image}${entry.name ? ` · ${entry.name}` : ''}${flags ? ` · ${flags}` : ''}`;
}

export async function historyCommand(): Promise<void> {
  const entries = loadHistory();

  if (entries.length === 0) {
    console.log(style.dim('No history yet. Launch a container with "dockerx run" or the menu first.'));
    return;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    printHistory(entries);
    return;
  }

  const pick = await select('Recent runs', [
    ...entries.map((entry, index) => ({
      value: index,
      label: formatHistoryLabel(entry),
      hint: entry.command ?? '',
    })),
    { value: -1, label: 'Back' },
  ]);

  if (pick === null || pick === -1) {
    return;
  }

  const entry = entries[pick];

  const action = await select(`Re-run ${entry.image}?`, [
    { value: 'rerun', label: 'Re-run as-is' },
    { value: 'modify', label: 'Modify before re-running' },
    { value: 'cancel', label: 'Cancel' },
  ]);

  if (action === 'rerun') {
    await executeRun(entry, true, false);
  } else if (action === 'modify') {
    await runInteractive(entry);
  }
}

export async function cleanHistoryCli(): Promise<void> {
  clearHistory();
  console.log(style.green('History cleared.'));
}

function printHistory(entries: HistoryEntry[]): void {
  for (const entry of entries) {
    const flags = [entry.detach && '--detach', entry.interactive && '-it']
      .filter(Boolean)
      .join(' ');
    console.log(`[${formatHistoryLabel(entry)}]${flags ? ` ${flags}` : ''}`);
  }
}