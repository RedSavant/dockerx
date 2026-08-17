import { runDocker, runDockerOutput } from './docker-executor.js';

export interface NetworkInfo {
  name: string;
  driver: string;
  scope: string;
}

export const NETWORK_DRIVERS = ['bridge', 'host', 'none', 'overlay', 'macvlan', 'ipvlan'];

export const BUILTIN_NETWORKS = new Set(['bridge', 'host', 'none']);

export function parseNetworksOutput(stdout: string): NetworkInfo[] {
  return stdout
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const parsed = JSON.parse(line) as { Name?: string; Driver?: string; Scope?: string };
      return {
        name: parsed.Name ?? '',
        driver: parsed.Driver ?? '',
        scope: parsed.Scope ?? '',
      };
    });
}

export function formatNetworkTable(networks: NetworkInfo[]): string {
  const nameWidth = Math.max('NAME'.length, ...networks.map((n) => n.name.length));
  const driverWidth = Math.max('DRIVER'.length, ...networks.map((n) => n.driver.length));
  const scopeWidth = Math.max('SCOPE'.length, ...networks.map((n) => n.scope.length));

  const header = `${'NAME'.padEnd(nameWidth)}  ${'DRIVER'.padEnd(driverWidth)}  ${'SCOPE'.padEnd(scopeWidth)}`;
  const rows = networks.map(
    (n) => `${n.name.padEnd(nameWidth)}  ${n.driver.padEnd(driverWidth)}  ${n.scope.padEnd(scopeWidth)}`,
  );
  return [header, ...rows].join('\n');
}

export async function listNetworks(): Promise<NetworkInfo[]> {
  const { code, stdout } = await runDockerOutput(['network', 'ls', '--format', '{{json .}}']);
  if (code !== 0) {
    throw new Error('Failed to list networks.');
  }
  return parseNetworksOutput(stdout);
}

export async function createNetwork(name: string, driver: string): Promise<number> {
  return runDocker(['network', 'create', '--driver', driver, name]);
}

export async function removeNetwork(name: string): Promise<number> {
  return runDocker(['network', 'rm', name]);
}

export async function inspectNetwork(name: string): Promise<number> {
  return runDocker(['network', 'inspect', name]);
}