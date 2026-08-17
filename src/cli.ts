#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
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
    try {
      await runCommand(options);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  });

program.parse();
