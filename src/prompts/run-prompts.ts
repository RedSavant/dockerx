import { confirm, input } from '@inquirer/prompts';
import type { EnvVar, PortMapping, RunOptions, VolumeMapping } from '../types/run-options.js';
import { ENV_NAME_PATTERN, isValidPort } from '../utils/validation.js';

const IMAGE_PATTERN = /^\S+$/;

export async function promptRunOptions(): Promise<RunOptions> {
  const image = await input({
    message: 'Which Docker image do you want to use?',
    default: 'node:22',
    validate: (value) =>
      IMAGE_PATTERN.test(value.trim()) ? true : 'Invalid image: it must not contain spaces.',
  });

  const name = (await input({ message: 'Container name (optional):' })).trim() || undefined;

  const ports = await promptPorts();
  const volumes = await promptVolumes();
  const envVars = await promptEnvVars();

  const interactive = await confirm({ message: 'Interactive mode (-it)?', default: true });
  const detach = await confirm({
    message: 'Run in the background (detached mode)?',
    default: false,
  });

  const command =
    (await input({ message: 'Command to run in the container (optional):' })).trim() || undefined;

  const rm = await confirm({ message: 'Add --rm automatically?', default: true });

  return {
    image: image.trim(),
    name,
    ports,
    volumes,
    envVars,
    interactive: interactive && !detach,
    detach,
    command,
    rm,
  };
}

export async function promptPorts(): Promise<PortMapping[]> {
  const addPorts = await confirm({ message: 'Add ports?', default: false });
  const ports: PortMapping[] = [];

  if (!addPorts) {
    return ports;
  }

  while (true) {
    const localValue = await input({
      message: 'Local port:',
      validate: (value) =>
        isValidPort(Number(value)) ? true : 'Invalid port: integer between 1 and 65535.',
    });
    const containerValue = await input({
      message: 'Container port:',
      validate: (value) =>
        isValidPort(Number(value)) ? true : 'Invalid port: integer between 1 and 65535.',
    });

    ports.push({ local: Number(localValue), container: Number(containerValue) });

    const more = await confirm({ message: 'Add another port?', default: false });
    if (!more) {
      break;
    }
  }

  return ports;
}

export async function promptVolumes(): Promise<VolumeMapping[]> {
  const addVolumes = await confirm({ message: 'Add volumes?', default: false });
  const volumes: VolumeMapping[] = [];

  if (!addVolumes) {
    return volumes;
  }

  while (true) {
    const local = await input({
      message: 'Local path:',
      validate: (value) => (value.trim() !== '' ? true : 'The local path is required.'),
    });
    const container = await input({
      message: 'Path in the container:',
      validate: (value) =>
        value.startsWith('/') ? true : 'The path in the container must be absolute (start with /).',
    });

    volumes.push({ local: local.trim(), container: container.trim() });

    const more = await confirm({ message: 'Add another volume?', default: false });
    if (!more) {
      break;
    }
  }

  return volumes;
}

export async function promptEnvVars(): Promise<EnvVar[]> {
  const addEnvVars = await confirm({ message: 'Add environment variables?', default: false });
  const envVars: EnvVar[] = [];

  if (!addEnvVars) {
    return envVars;
  }

  while (true) {
    const name = await input({
      message: 'Variable name:',
      validate: (value) =>
        ENV_NAME_PATTERN.test(value.trim())
          ? true
          : 'Invalid name: letters, digits and underscores only (must not start with a digit).',
    });
    const value = await input({ message: `Value of ${name.trim()} (empty allowed):`, default: '' });

    envVars.push({ name: name.trim(), value });

    const more = await confirm({ message: 'Add another variable?', default: false });
    if (!more) {
      break;
    }
  }

  return envVars;
}
