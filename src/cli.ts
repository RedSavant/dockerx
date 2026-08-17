#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { cleanHistoryCli, historyCommand } from './commands/history.js';
import { openMenu } from './commands/open.js';
import {
  createNetworkCli,
  inspectNetworkCli,
  listNetworksCli,
  removeNetworksCli,
} from './commands/network.js';
import { NETWORK_DRIVERS } from './docker/networks.js';
import { runCommand, type RunCliOptions } from './commands/run.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  version: string;
};

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

const program = new Command();

program
  .name('dockerx')
  .description('Interactive assistant for building and running docker run commands.')
  .version(pkg.version);

program
  .command('run')
  .description(
    'Builds a docker run command interactively, or non-interactively when an image is provided.',
  )
  .argument('[image]', 'Docker image to use (e.g. node:22)')
  .option('--name <name>', 'container name')
  .option('--port <local:container>', 'port mapping (repeatable)', collect, [])
  .option('--volume <local:container>', 'volume mapping (repeatable)', collect, [])
  .option('--env <KEY=value>', 'environment variable (repeatable)', collect, [])
  .option('-d, --detach', 'run in the background (detached mode)')
  .option('--no-rm', 'do not remove the container when it exits (disables --rm)')
  .option('--dry-run', 'print the generated command without running it')
  .action(async (image: string | undefined, rawOptions: Record<string, unknown>) => {
    const options: RunCliOptions = {
      image,
      name: rawOptions.name as string | undefined,
      ports: rawOptions.port as string[] | undefined,
      volumes: rawOptions.volume as string[] | undefined,
      env: rawOptions.env as string[] | undefined,
      detach: rawOptions.detach as boolean | undefined,
      rm: rawOptions.rm as boolean | undefined,
      dryRun: rawOptions.dryRun as boolean | undefined,
    };
    return runSafely(() => runCommand(options));
  });

program
  .command('open')
  .description('Opens the interactive DockerX menu.')
  .action(() => runSafely(openMenu));

const network = program.command('network').description('Manage Docker networks.');

network
  .command('ls')
  .description('List networks.')
  .action(() => runSafely(listNetworksCli));

network
  .command('create')
  .description('Create a network.')
  .argument('<name>', 'network name')
  .option(
    '-d, --driver <driver>',
    `network driver (${NETWORK_DRIVERS.join(', ')})`,
    'bridge',
  )
  .action((name: string, rawOptions: { driver?: string }) =>
    runSafely(() => createNetworkCli(name, rawOptions.driver ?? 'bridge')),
  );

network
  .command('rm')
  .alias('remove')
  .description('Remove one or more networks.')
  .argument('<name...>', 'network names')
  .action((names: string[]) => runSafely(() => removeNetworksCli(names)));

network
  .command('inspect')
  .description('Display detailed information about a network.')
  .argument('<name>', 'network name')
  .action((name: string) => runSafely(() => inspectNetworkCli(name)));

const history = program
  .command('history')
  .description('Shows the last launched containers; pick one to re-run or modify.');

history.action(() => runSafely(historyCommand));

history
  .command('clean')
  .description('Clears the command history.')
  .action(() => runSafely(cleanHistoryCli));

program.parse();

async function runSafely(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
