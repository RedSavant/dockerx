import { readKey, withRawMode } from './keys.js';
import { style } from './render.js';

export async function pressAnyKey(message = 'Press Enter to continue'): Promise<void> {
  await withRawMode(async () => {
    process.stdout.write(style.dim(`\n${message}…`));
    await readKey();
  });
}