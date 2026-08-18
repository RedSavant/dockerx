import { load } from 'js-yaml';
import type { ComposeProject, ServiceOptions } from './types.js';
import type { EnvVar, PortMapping, VolumeMapping } from '../types/run-options.js';

interface RawService {
  image?: string;
  container_name?: string;
  ports?: unknown[];
  volumes?: unknown[];
  environment?: Record<string, unknown> | unknown[];
  stdin_open?: boolean;
  tty?: boolean;
  command?: string | string[];
  depends_on?: unknown[];
  restart?: string;
  working_dir?: string;
}

export function parseComposeYaml(content: string): ComposeProject {
  const parsed = load(content) as { services?: Record<string, RawService> } | null;

  if (!parsed || typeof parsed !== 'object' || !parsed.services || typeof parsed.services !== 'object') {
    throw new Error('The file must contain a "services:" section.');
  }

  const services = Object.entries(parsed.services).map(([key, raw]) =>
    parseService(key, raw ?? {}),
  );

  if (services.length === 0) {
    throw new Error('The file does not declare any service.');
  }

  return { services };
}

function parseService(key: string, raw: RawService): ServiceOptions {
  return {
    image: typeof raw.image === 'string' ? raw.image : key,
    name: typeof raw.container_name === 'string' ? raw.container_name : undefined,
    ports: parsePorts(raw.ports),
    volumes: parseVolumes(raw.volumes),
    envVars: parseEnv(raw.environment),
    interactive: raw.stdin_open === true || raw.tty === true,
    command: normalizeCommand(raw.command),
    dependsOn: parseDependsOn(raw.depends_on),
    restart: ['no', 'always', 'on-failure'].includes(raw.restart ?? '')
      ? (raw.restart as ServiceOptions['restart'])
      : undefined,
    workingDir: typeof raw.working_dir === 'string' ? raw.working_dir : undefined,
  };
}

function parsePorts(ports: unknown[] | undefined): PortMapping[] {
  if (!Array.isArray(ports)) {
    return [];
  }

  const result: PortMapping[] = [];
  for (const value of ports) {
    const match = typeof value === 'string' ? /^(\d+):(\d+)$/.exec(value) : null;
    if (match) {
      result.push({ local: Number(match[1]), container: Number(match[2]) });
    }
  }
  return result;
}

function parseVolumes(volumes: unknown[] | undefined): VolumeMapping[] {
  if (!Array.isArray(volumes)) {
    return [];
  }

  const result: VolumeMapping[] = [];
  for (const value of volumes) {
    const parts = typeof value === 'string' ? value.split(':') : [];
    if (parts.length >= 2) {
      result.push({ local: parts[0], container: parts.slice(1).join(':') });
    }
  }
  return result;
}

function parseEnv(environment: RawService['environment']): EnvVar[] {
  if (Array.isArray(environment)) {
    return environment
      .filter((item): item is string => typeof item === 'string' && item.includes('='))
      .map((item) => {
        const separator = item.indexOf('=');
        return { name: item.slice(0, separator), value: item.slice(separator + 1) };
      });
  }

  if (environment && typeof environment === 'object') {
    return Object.entries(environment).map(([name, value]) => ({
      name,
      value: String(value),
    }));
  }

  return [];
}

function normalizeCommand(command: RawService['command']): string | undefined {
  if (typeof command === 'string') {
    return command;
  }
  if (Array.isArray(command)) {
    return command.join(' ');
  }
  return undefined;
}

function parseDependsOn(dependsOn: unknown[] | undefined): string[] {
  if (!Array.isArray(dependsOn)) {
    return [];
  }
  return dependsOn
    .map((value) => (typeof value === 'string' ? value : ''))
    .filter(Boolean);
}