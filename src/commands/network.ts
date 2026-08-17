import { requireDocker } from '../docker/docker-executor.js';
import {
  NETWORK_DRIVERS,
  createNetwork,
  formatNetworkTable,
  inspectNetwork,
  listNetworks,
  removeNetwork,
} from '../docker/networks.js';
import { style } from '../tui/render.js';
import { NETWORK_NAME_PATTERN } from '../utils/validation.js';

export async function listNetworksCli(): Promise<void> {
  await requireDocker();
  console.log(formatNetworkTable(await listNetworks()));
}

export async function createNetworkCli(name: string, driver: string): Promise<void> {
  if (!NETWORK_NAME_PATTERN.test(name)) {
    throw new Error(
      'Invalid network name: letters, digits, dots, dashes and underscores (must not start with a dot).',
    );
  }
  if (!NETWORK_DRIVERS.includes(driver)) {
    throw new Error(`Invalid driver "${driver}". Expected one of: ${NETWORK_DRIVERS.join(', ')}.`);
  }

  await requireDocker();
  const code = await createNetwork(name, driver);
  if (code !== 0) {
    throw new Error(`Failed to create network "${name}".`);
  }
  console.log(style.green(`Created network "${name}" with driver "${driver}".`));
}

export async function removeNetworksCli(names: string[]): Promise<void> {
  await requireDocker();
  for (const name of names) {
    const code = await removeNetwork(name);
    if (code !== 0) {
      throw new Error(`Failed to remove network "${name}".`);
    }
    console.log(style.green(`Removed network "${name}".`));
  }
}

export async function inspectNetworkCli(name: string): Promise<void> {
  await requireDocker();
  await inspectNetwork(name);
}