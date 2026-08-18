import { findComposeFile, readComposeFile } from '../compose/file.js';
import { parseComposeYaml } from '../compose/parser.js';
import type { ComposeProject } from '../compose/types.js';
import { requireDocker, runDocker, runDockerOutput } from '../docker/docker-executor.js';

export async function requireCompose(): Promise<void> {
  await requireDocker();
  const { code } = await runDockerOutput(['compose', 'version']);
  if (code !== 0) {
    throw new Error(
      'Docker Compose (the "docker compose" v2 plugin) is required but not available.',
    );
  }
}

export function loadProjectFromCwd(): { file: string; project: ComposeProject } {
  const file = findComposeFile(process.cwd());
  if (!file) {
    throw new Error(
      `No compose file found in ${process.cwd()} (expected compose.yaml, compose.yml or docker-compose.yml). Run "dockerx compose" to create one interactively.`,
    );
  }
  return { file, project: parseComposeYaml(readComposeFile(file)) };
}

export async function composeUpCli(file: string, detach: boolean): Promise<void> {
  await requireCompose();
  const code = await runDocker(['compose', '-f', file, ...(detach ? ['up', '-d'] : ['up'])]);
  if (code !== 0) {
    process.exitCode = code;
  }
}

export async function composeDownCli(file: string): Promise<void> {
  await requireCompose();
  const code = await runDocker(['compose', '-f', file, 'down']);
  if (code !== 0) {
    process.exitCode = code;
  }
}

export async function composePsCli(file: string): Promise<void> {
  await requireCompose();
  const code = await runDocker(['compose', '-f', file, 'ps']);
  if (code !== 0) {
    process.exitCode = code;
  }
}

export async function composeLogsCli(file: string): Promise<void> {
  await requireCompose();
  const code = await runDocker(['compose', '-f', file, 'logs', '-f']);
  if (code !== 0) {
    process.exitCode = code;
  }
}

export async function composeConfigCli(file: string): Promise<void> {
  await requireCompose();
  const { code, stdout } = await runDockerOutput(['compose', '-f', file, 'config']);
  process.stdout.write(stdout);
  if (code !== 0) {
    process.exitCode = code;
  }
}