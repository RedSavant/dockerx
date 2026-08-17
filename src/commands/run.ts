import { confirm, input } from '@inquirer/prompts';
import { buildDockerArgs, formatDisplayCommand } from '../docker/command-builder.js';
import { requireDocker, runDocker } from '../docker/docker-executor.js';
import { addHistoryEntry } from '../history/store.js';
import {
  promptEnvVars,
  promptPorts,
  promptRunOptions,
  promptVolumes,
} from '../prompts/run-prompts.js';
import { checklist } from '../tui/checklist.js';
import type { RunOptions } from '../types/run-options.js';
import { parseEnvVar, parsePortMapping, parseVolumeMapping } from '../utils/validation.js';

export interface RunCliOptions {
  image?: string;
  name?: string;
  ports?: string[];
  volumes?: string[];
  env?: string[];
  detach?: boolean;
  rm?: boolean;
  dryRun?: boolean;
}

export async function runCommand(cli: RunCliOptions): Promise<void> {
  const options = cli.image ? buildOptionsFromCli(cli) : await promptRunOptions();
  await executeRun(options, !cli.image, cli.dryRun === true);
}

export async function runInteractive(initial?: RunOptions): Promise<void> {
  const selected = await checklist<string>('Configure your docker run', [
    { value: 'image', label: 'Image', hint: initial?.image ?? 'default node:22', toggled: initial?.image !== undefined },
    { value: 'name', label: 'Container name', toggled: initial?.name !== undefined },
    { value: 'ports', label: 'Ports', hint: 'local:container', toggled: (initial?.ports.length ?? 0) > 0 },
    { value: 'volumes', label: 'Volumes', hint: 'local:container', toggled: (initial?.volumes.length ?? 0) > 0 },
    { value: 'env', label: 'Environment variables', hint: 'NAME=value', toggled: (initial?.envVars.length ?? 0) > 0 },
    { value: 'interactive', label: 'Interactive mode', hint: '-it', toggled: initial?.interactive === true },
    { value: 'detach', label: 'Detached mode', hint: '--detach', toggled: initial?.detach === true },
    { value: 'rm', label: 'Remove on exit', hint: '--rm', toggled: initial?.rm ?? true },
    { value: 'command', label: 'Command to run', toggled: initial?.command !== undefined },
    { value: 'run', label: 'Run container', done: true },
  ]);
  if (!selected) return;

  const want = new Set(selected);
  want.delete('run');

  const image = want.has('image') ? await askImage(initial?.image) : initial?.image ?? 'node:22';
  const name = want.has('name')
    ? await askOptional('Container name (optional):', initial?.name)
    : undefined;
  const ports = want.has('ports') ? await promptPorts() : [];
  const volumes = want.has('volumes') ? await promptVolumes() : [];
  const envVars = want.has('env') ? await promptEnvVars() : [];
  const detach = want.has('detach');
  const interactive = want.has('interactive') && !detach;
  const rm = want.has('rm');
  const command = want.has('command')
    ? await askOptional('Command to run in the container (optional):', initial?.command)
    : undefined;

  await executeRun({ image, name, ports, volumes, envVars, interactive, detach, command, rm }, true, false);
}

async function askImage(initialImage?: string): Promise<string> {
  const value = await input({
    message: 'Image:',
    default: initialImage ?? 'node:22',
    validate: (v) => (/^\S+$/.test(v.trim()) ? true : 'Invalid image: it must not contain spaces.'),
  });
  return value.trim();
}

async function askOptional(message: string, initialValue?: string): Promise<string | undefined> {
  const value = await input({
    message,
    ...(initialValue !== undefined ? { default: initialValue } : {}),
  });
  return value.trim() || undefined;
}

export async function executeRun(options: RunOptions, confirmBeforeRun: boolean, dryRun: boolean): Promise<void> {
  const args = buildDockerArgs(options);

  console.log('\nGenerated command:');
  console.log(formatDisplayCommand(args));

  if (dryRun) {
    console.log('Dry-run: the command was not executed.');
    return;
  }

  if (confirmBeforeRun) {
    const proceed = await confirm({ message: 'Run this command?', default: true });
    if (!proceed) {
      console.log('Execution cancelled.');
      return;
    }
  }

  try {
    await requireDocker();

    const exitCode = await runDocker(args);
    addHistoryEntry(options, exitCode !== 0);
    process.exitCode = exitCode;
  } catch (error) {
    addHistoryEntry(options, true);
    throw error;
  }
}

function buildOptionsFromCli(cli: RunCliOptions): RunOptions {
  const options: RunOptions = {
    image: cli.image as string,
    name: cli.name?.trim() || undefined,
    ports: [],
    volumes: [],
    envVars: [],
    interactive: false,
    detach: cli.detach === true,
    rm: cli.rm !== false,
  };

  for (const value of cli.ports ?? []) {
    const parsed = parsePortMapping(value);
    if (!parsed) {
      throw new Error(`Invalid port: "${value}". Expected format: <localPort>:<containerPort>.`);
    }
    options.ports.push(parsed);
  }

  for (const value of cli.volumes ?? []) {
    const parsed = parseVolumeMapping(value);
    if (!parsed) {
      throw new Error(`Invalid volume: "${value}". Expected format: <localPath>:<containerPath>.`);
    }
    options.volumes.push(parsed);
  }

  for (const value of cli.env ?? []) {
    const parsed = parseEnvVar(value);
    if (!parsed) {
      throw new Error(`Invalid environment variable: "${value}". Expected format: <NAME>=<value>.`);
    }
    options.envVars.push(parsed);
  }

  return options;
}