import type { RunOptions } from '../types/run-options.js';

export function buildDockerArgs(options: RunOptions): string[] {
  if (options.detach && options.interactive) {
    throw new Error('Detached mode (-d) and interactive mode (-it) are incompatible.');
  }

  const args: string[] = ['run'];

  if (options.rm) {
    args.push('--rm');
  }
  if (options.detach) {
    args.push('--detach');
  }
  if (options.interactive) {
    args.push('-it');
  }
  if (options.name) {
    args.push('--name', options.name);
  }
  for (const port of options.ports) {
    args.push('-p', `${port.local}:${port.container}`);
  }
  for (const volume of options.volumes) {
    args.push('-v', `${volume.local}:${volume.container}`);
  }
  for (const envVar of options.envVars) {
    args.push('-e', `${envVar.name}=${envVar.value}`);
  }

  args.push(options.image);

  if (options.command) {
    args.push(...options.command.trim().split(/\s+/).filter(Boolean));
  }

  return args;
}

export function formatDisplayCommand(args: string[]): string {
  const quoted = args.map((arg) => {
    if (/[\s"'`$\\]/.test(arg)) {
      return `'${arg.replace(/'/g, `'\\''`)}'`;
    }
    return arg;
  });
  return `docker ${quoted.join(' ')}`;
}
