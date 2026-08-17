import { readKey, withRawMode } from './keys.js';
import { Screen, style, truncate } from './render.js';

export interface CheckItem<T> {
  value: T;
  label: string;
  hint?: string;
  toggled?: boolean;
  done?: boolean;
}

export async function checklist<T>(title: string, items: CheckItem<T>[]): Promise<Set<T> | null> {
  return withRawMode(async () => {
    const screen = new Screen();
    const checked = items.map((item) => item.toggled === true);
    let index = 0;

    while (true) {
      screen.render(buildFrame(title, items, checked, index));
      const key = await readKey();

      switch (key.name) {
        case 'up':
        case 'tab-back':
          index = (index - 1 + items.length) % items.length;
          break;
        case 'down':
        case 'tab':
          index = (index + 1) % items.length;
          break;
        case 'home':
          index = 0;
          break;
        case 'end':
          index = items.length - 1;
          break;
        case 'space':
          if (!items[index].done) checked[index] = !checked[index];
          break;
        case 'enter':
          if (items[index].done) {
            const selected = new Set<T>();
            items.forEach((item, i) => {
              if (checked[i]) selected.add(item.value);
            });
            return selected;
          }
          checked[index] = !checked[index];
          break;
        case 'escape':
        case 'ctrl-c':
          return null;
        default:
          break;
      }
    }
  });
}

function buildFrame<T>(
  title: string,
  items: CheckItem<T>[],
  checked: boolean[],
  index: number,
): string[] {
  const width = Math.max(...items.map((item) => item.label.length));
  const lines: string[] = [style.bold(title), ''];

  items.forEach((item, i) => {
    const label = item.label.padEnd(width);
    const mark = item.done ? `▶ ${label}` : `[${checked[i] ? 'x' : ' '}] ${label}`;
    const box = i === index ? style.highlighted(` ${mark} `) : ` ${mark} `;
    const row = `${i === index ? style.cyan('❯') : ' '} ${box}`;
    const hint = item.hint ? `  ${style.dim(truncate(item.hint, 45))}` : '';
    lines.push(row + hint);
  });

  lines.push('', style.dim('↑/↓ or Tab: move · Space/Enter: toggle · Enter on ▶: run · Esc: cancel'));
  return lines;
}
