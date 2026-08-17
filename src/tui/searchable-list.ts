import { EventEmitter } from 'node:events';
import { createKeyQueue, type Key, withRawMode } from './keys.js';
import { Screen, style, truncate } from './render.js';

export interface SearchItem {
  label: string;
  value?: string;
  hint?: string;
}

export interface SearchableListOptions {
  title: string;
  promptLabel: string;
  initialLoad?: () => Promise<SearchItem[]>;
  onSearch: (query: string) => Promise<SearchItem[]>;
  allowCustom?: boolean;
}

const DEBOUNCE_MS = 250;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function searchableList(options: SearchableListOptions): Promise<string | null> {
  return withRawMode(async () => {
    const screen = new Screen();
    const keys = createKeyQueue();
    const searchDone = new EventEmitter();
    const allowCustom = options.allowCustom !== false;
    let query = '';
    let items: SearchItem[] = [];
    let selected = 0;
    let loading = options.initialLoad !== undefined;
    let error: string | null = null;
    let requestId = 0;

    const runSearch = (): void => {
      const id = ++requestId;
      const term = query;
      loading = true;
      void (async () => {
        await delay(DEBOUNCE_MS);
        if (id !== requestId) return;
        try {
          const results = await options.onSearch(term);
          if (id !== requestId) return;
          items = results;
          selected = 0;
          error = null;
        } catch (err) {
          if (id !== requestId) return;
          error = err instanceof Error ? err.message : String(err);
        } finally {
          if (id === requestId) {
            loading = false;
            searchDone.emit('search');
          }
        }
      })();
    };

    try {
      if (options.initialLoad) {
        screen.render(buildFrame(options, query, items, selected, loading, error));
        try {
          items = await options.initialLoad();
        } catch (err) {
          error = err instanceof Error ? err.message : String(err);
        } finally {
          loading = false;
        }
      }

      while (true) {
        screen.render(buildFrame(options, query, items, selected, loading, error));

        const doneSignal = new Promise<'search-done'>((resolve) => {
          searchDone.once('search', () => resolve('search-done'));
        });
        const result = loading ? await Promise.race([keys.next(), doneSignal]) : await keys.next();
        if (result === 'search-done') continue;
        const key = result as Key;

        switch (key.name) {
          case 'up':
          case 'tab-back':
            if (items.length > 0) selected = (selected - 1 + items.length) % items.length;
            break;
          case 'down':
          case 'tab':
            if (items.length > 0) selected = (selected + 1) % items.length;
            break;
          case 'home':
            selected = 0;
            break;
          case 'end':
            selected = items.length - 1;
            break;
          case 'char':
            if (key.char) {
              query += key.char;
              runSearch();
            }
            break;
          case 'backspace':
            query = query.slice(0, -1);
            runSearch();
            break;
          case 'enter':
            if (items.length > 0) return items[selected].value ?? items[selected].label;
            if (allowCustom && query.trim() !== '') return query.trim();
            break;
          case 'escape':
          case 'ctrl-c':
            return null;
          default:
            break;
        }
      }
    } finally {
      keys.close();
    }
  });
}

function buildFrame(
  options: SearchableListOptions,
  query: string,
  items: SearchItem[],
  selected: number,
  loading: boolean,
  error: string | null,
): string[] {
  const cursor = style.inverse(' ');
  const lines: string[] = [
    style.bold(options.title),
    '',
    `${style.dim(options.promptLabel)} ${query}${cursor}${loading ? ` ${style.dim('searching…')}` : ''}`,
  ];

  if (error) {
    lines.push(style.red(`  search failed: ${truncate(error, 60)}`));
  }

  if (items.length === 0) {
    if (!loading) {
      lines.push(style.dim('  no results yet. Type to search Docker Hub, or press Enter to use your query directly.'));
    }
  } else {
    const width = Math.max(...items.map((item) => item.label.length), 1);
    items.forEach((item, i) => {
      const label = item.label.padEnd(width);
      const box = i === selected ? style.highlighted(` ${label} `) : `[ ${label} ]`;
      const row = `${i === selected ? style.cyan('❯') : ' '} ${box}`;
      const hint = item.hint ? `  ${style.dim(truncate(item.hint, 50))}` : '';
      lines.push(row + hint);
    });
  }

  lines.push('', style.dim('↑/↓ or Tab: move · Enter: select · Esc: back'));
  return lines;
}