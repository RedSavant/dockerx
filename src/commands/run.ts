import { confirm } from '@inquirer/prompts';
import { buildDockerArgs, formatDisplayCommand } from '../docker/command-builder.js';
import { checkDockerAvailable, runDocker } from '../docker/docker-executor.js';
import { promptRunOptions } from '../prompts/run-prompts.js';
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
  const args = buildDockerArgs(options);

  console.log('\nGenerated command:');
  console.log(formatDisplayCommand(args));

  if (cli.dryRun) {
    console.log('Dry-run: the command was not executed.');
    return;
  }

  if (!cli.image) {
    const proceed = await confirm({ message: 'Run this command?', default: true });
    if (!proceed) {
      console.log('Execution cancelled.');
      return;
    }
  }

  const available = await checkDockerAvailable();
  if (!available) {
    throw new Error(
      'Docker is not available. Install Docker and make sure the daemon is running (try "docker --version").',
    );
  }

  const exitCode = await runDocker(args);
  process.exitCode = exitCode;
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
