import { readKey, withRawMode } from './keys.js';
import { Screen, style, truncate } from './render.js';

export interface Choice<T> {
  value: T;
  label: string;
  hint?: string;
}

export async function select<T>(title: string, choices: Choice<T>[]): Promise<T | null> {
  return withRawMode(async () => {
    const screen = new Screen();
    let index = 0;

    while (true) {
      screen.render(buildFrame(title, choices, index));
      const key = await readKey();

      switch (key.name) {
        case 'up':
        case 'tab-back':
          index = (index - 1 + choices.length) % choices.length;
          break;
        case 'down':
        case 'tab':
          index = (index + 1) % choices.length;
          break;
        case 'home':
          index = 0;
          break;
        case 'end':
          index = choices.length - 1;
          break;
        case 'enter':
          return choices[index].value;
        case 'escape':
        case 'ctrl-c':
          return null;
        default:
          break;
      }
    }
  });
}

function buildFrame<T>(title: string, choices: Choice<T>[], index: number): string[] {
  const width = Math.max(...choices.map((choice) => choice.label.length));
  const lines: string[] = [style.bold(title), ''];

  choices.forEach((choice, i) => {
    const label = choice.label.padEnd(width);
    const box = i === index ? style.highlighted(` ${label} `) : `[ ${label} ]`;
    const row = `${i === index ? style.cyan('❯') : ' '} ${box}`;
    const hint = choice.hint ? `  ${style.dim(truncate(choice.hint, 45))}` : '';
    lines.push(row + hint);
  });

  lines.push('', style.dim('↑/↓ or Tab: move · Enter: select · Esc: cancel'));
  return lines;
}
