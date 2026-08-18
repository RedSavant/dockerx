import { composeMenu } from './compose-menu.js';
import { historyCommand } from './history.js';
import { networkMenu } from './network-menu.js';
import { pullImage } from './pull.js';
import { runInteractive } from './run.js';
import { style } from '../tui/render.js';
import { select } from '../tui/select.js';

export async function openMenu(): Promise<void> {
  const choices = [
    { value: 'pull', label: 'Pull an image', hint: 'search and pull from Docker Hub' },
    { value: 'run', label: 'Run', hint: 'build a docker run command yourself' },
    { value: 'history', label: 'History', hint: 're-run or modify a previous run' },
    { value: 'compose', label: 'Compose', hint: 'create and manage a compose project' },
    { value: 'network', label: 'Network', hint: 'list, create, remove, inspect' },
    { value: 'exit', label: 'Exit' },
  ];

  while (true) {
    const choice = await select('DockerX', choices);
    if (choice === 'pull') {
      await guard(pullImage);
    } else if (choice === 'run') {
      await guard(runInteractive);
    } else if (choice === 'history') {
      await guard(historyCommand);
    } else if (choice === 'compose') {
      await guard(composeMenu);
    } else if (choice === 'network') {
      await guard(networkMenu);
    } else {
      return;
    }
  }
}

async function guard(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    console.error(style.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
  }
}