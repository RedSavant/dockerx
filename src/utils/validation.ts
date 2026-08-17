export const PORT_MIN = 1;
export const PORT_MAX = 65535;
export const ENV_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
export const NETWORK_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

export function isValidPort(value: number): boolean {
  return Number.isInteger(value) && value >= PORT_MIN && value <= PORT_MAX;
}

export function parsePortMapping(value: string): { local: number; container: number } | null {
  const parts = value.split(':');
  if (parts.length !== 2) {
    return null;
  }
  const local = Number(parts[0]);
  const container = Number(parts[1]);
  if (!isValidPort(local) || !isValidPort(container)) {
    return null;
  }
  return { local, container };
}

export function parseVolumeMapping(value: string): { local: string; container: string } | null {
  const separator = value.indexOf(':');
  if (separator <= 0 || separator === value.length - 1) {
    return null;
  }
  const local = value.slice(0, separator);
  const container = value.slice(separator + 1);
  if (local.trim() === '' || container.trim() === '') {
    return null;
  }
  return { local, container };
}

export function parseEnvVar(value: string): { name: string; value: string } | null {
  const separator = value.indexOf('=');
  if (separator <= 0) {
    return null;
  }
  const name = value.slice(0, separator);
  if (!ENV_NAME_PATTERN.test(name)) {
    return null;
  }
  return { name, value: value.slice(separator + 1) };
}
