import { confirm, input } from '@inquirer/prompts';
import {
  BUILTIN_NETWORKS,
  NETWORK_DRIVERS,
  createNetwork,
  formatNetworkTable,
  inspectNetwork,
  listNetworks,
  removeNetwork,
} from '../docker/networks.js';
import { requireDocker } from '../docker/docker-executor.js';
import { style } from '../tui/render.js';
import { pressAnyKey } from '../tui/press-any-key.js';
import { select } from '../tui/select.js';
import { NETWORK_NAME_PATTERN } from '../utils/validation.js';

const DRIVER_HINTS: Record<string, string> = {
  bridge: 'default · local networking',
  host: 'use the host network stack',
  none: 'no networking',
  overlay: 'multi-host networking (swarm)',
  macvlan: 'assign MAC addresses to containers',
  ipvlan: 'no MAC addresses, lighter than macvlan',
};

export async function networkMenu(): Promise<void> {
  await requireDocker();

  const choices = [
    { value: 'list', label: 'List networks' },
    { value: 'create', label: 'Create a network', hint: 'choose a driver' },
    { value: 'remove', label: 'Remove a network' },
    { value: 'inspect', label: 'Inspect a network' },
    { value: 'back', label: 'Back' },
  ];

  while (true) {
    const choice = await select('Network management', choices);
    if (choice === 'list') {
      await listFlow();
    } else if (choice === 'create') {
      await createFlow();
    } else if (choice === 'remove') {
      await removeFlow();
    } else if (choice === 'inspect') {
      await inspectFlow();
    } else {
      return;
    }
  }
}

async function listFlow(): Promise<void> {
  console.log(formatNetworkTable(await listNetworks()));
  await pressAnyKey();
}

async function createFlow(): Promise<void> {
  const name = (
    await input({
      message: 'Network name:',
      validate: (value) =>
        NETWORK_NAME_PATTERN.test(value.trim())
          ? true
          : 'Invalid name: letters, digits, dots, dashes and underscores (must not start with a dot).',
    })
  ).trim();

  const driver = await select(
    'Network driver',
    NETWORK_DRIVERS.map((value) => ({ value, label: value, hint: DRIVER_HINTS[value] })),
  );
  if (!driver) return;

  console.log(style.green(`Creating network "${name}" with driver "${driver}"…`));
  const code = await createNetwork(name, driver);
  if (code === 0) {
    console.log(style.green(`Network "${name}" created.`));
  } else {
    console.error(style.red(`Failed to create network "${name}".`));
  }
}

async function removeFlow(): Promise<void> {
  const networks = await listNetworks();
  const removable = networks.filter((network) => !BUILTIN_NETWORKS.has(network.name));
  if (removable.length === 0) {
    console.log(style.dim('No removable networks (bridge, host and none are built-in).'));
    return;
  }

  const choice = await select(
    'Remove a network',
    removable.map((network) => ({
      value: network.name,
      label: network.name,
      hint: `${network.driver} · ${network.scope}`,
    })),
  );
  if (!choice) return;

  const proceed = await confirm({ message: `Remove network "${choice}"?`, default: false });
  if (!proceed) {
    console.log('Cancelled.');
    return;
  }

  const code = await removeNetwork(choice);
  if (code === 0) {
    console.log(style.green(`Network "${choice}" removed.`));
  } else {
    console.error(style.red(`Failed to remove network "${choice}".`));
  }
}

async function inspectFlow(): Promise<void> {
  const networks = await listNetworks();
  if (networks.length === 0) {
    console.log(style.dim('No networks found.'));
    return;
  }

  const choice = await select(
    'Inspect a network',
    networks.map((network) => ({
      value: network.name,
      label: network.name,
      hint: `${network.driver} · ${network.scope}`,
    })),
  );
  if (!choice) return;

  await inspectNetwork(choice);
  await pressAnyKey('Press Enter to go back');
}