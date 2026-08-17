import { describe, expect, it } from 'vitest';
import { buildDockerArgs, formatDisplayCommand } from '../src/docker/command-builder.js';
import type { RunOptions } from '../src/types/run-options.js';
import { parseEnvVar, parsePortMapping, parseVolumeMapping } from '../src/utils/validation.js';

function baseOptions(overrides: Partial<RunOptions> = {}): RunOptions {
  return {
    image: 'node:22',
    ports: [],
    volumes: [],
    envVars: [],
    interactive: false,
    detach: false,
    rm: true,
    ...overrides,
  };
}

describe('buildDockerArgs', () => {
  it('generates a basic Docker command', () => {
    expect(buildDockerArgs(baseOptions())).toEqual(['run', '--rm', 'node:22']);
  });

  it('adds the container name', () => {
    expect(buildDockerArgs(baseOptions({ name: 'my-app' }))).toEqual([
      'run',
      '--rm',
      '--name',
      'my-app',
      'node:22',
    ]);
  });

  it('adds multiple ports', () => {
    expect(
      buildDockerArgs(
        baseOptions({
          ports: [
            { local: 3000, container: 3000 },
            { local: 8080, container: 80 },
          ],
        }),
      ),
    ).toEqual(['run', '--rm', '-p', '3000:3000', '-p', '8080:80', 'node:22']);
  });

  it('adds multiple volumes', () => {
    expect(
      buildDockerArgs(
        baseOptions({
          volumes: [
            { local: '/data', container: '/app/data' },
            { local: '/logs', container: '/var/log' },
          ],
        }),
      ),
    ).toEqual(['run', '--rm', '-v', '/data:/app/data', '-v', '/logs:/var/log', 'node:22']);
  });

  it('adds multiple environment variables', () => {
    expect(
      buildDockerArgs(
        baseOptions({
          envVars: [
            { name: 'NODE_ENV', value: 'production' },
            { name: 'PORT', value: '3000' },
          ],
        }),
      ),
    ).toEqual(['run', '--rm', '-e', 'NODE_ENV=production', '-e', 'PORT=3000', 'node:22']);
  });

  it('enables detached mode', () => {
    expect(buildDockerArgs(baseOptions({ detach: true }))).toEqual([
      'run',
      '--rm',
      '--detach',
      'node:22',
    ]);
  });

  it('disables --rm', () => {
    expect(buildDockerArgs(baseOptions({ rm: false }))).toEqual(['run', 'node:22']);
  });

  it('adds -it in interactive mode', () => {
    expect(buildDockerArgs(baseOptions({ interactive: true }))).toEqual([
      'run',
      '--rm',
      '-it',
      'node:22',
    ]);
  });

  it('handles a custom command', () => {
    expect(buildDockerArgs(baseOptions({ command: 'npm run dev' }))).toEqual([
      'run',
      '--rm',
      'node:22',
      'npm',
      'run',
      'dev',
    ]);
  });

  it('rejects detached mode combined with interactive mode', () => {
    expect(() => buildDockerArgs(baseOptions({ detach: true, interactive: true }))).toThrow(
      /incompatible/,
    );
  });
});

describe('parsePortMapping', () => {
  it('accepts a valid mapping', () => {
    expect(parsePortMapping('3000:3000')).toEqual({ local: 3000, container: 3000 });
  });

  it.each(['abc', '3000', '0:8080', '70000:80', '3000:3000:extra', ':-1'])(
    'rejects invalid port "%s"',
    (value) => {
      expect(parsePortMapping(value)).toBeNull();
    },
  );
});

describe('parseVolumeMapping', () => {
  it('accepts a valid mapping', () => {
    expect(parseVolumeMapping('/data:/app')).toEqual({ local: '/data', container: '/app' });
  });

  it.each(['', '/data', ':/app', '/data:', ':'])('rejects invalid volume "%s"', (value) => {
    expect(parseVolumeMapping(value)).toBeNull();
  });
});

describe('parseEnvVar', () => {
  it('accepts a valid variable', () => {
    expect(parseEnvVar('NODE_ENV=development')).toEqual({ name: 'NODE_ENV', value: 'development' });
  });

  it('accepts an empty value', () => {
    expect(parseEnvVar('EMPTY=')).toEqual({ name: 'EMPTY', value: '' });
  });

  it.each(['', '=value', '1NAME=value', 'NAME WITH SPACE=x'])(
    'rejects invalid variable "%s"',
    (value) => {
      expect(parseEnvVar(value)).toBeNull();
    },
  );
});

describe('formatDisplayCommand', () => {
  it('does not quote simple arguments', () => {
    expect(formatDisplayCommand(['run', '--name', 'my-app', 'node:22'])).toBe(
      'docker run --name my-app node:22',
    );
  });

  it('quotes arguments containing spaces', () => {
    const args = buildDockerArgs(
      baseOptions({ volumes: [{ local: '/path/to project', container: '/app' }] }),
    );
    expect(formatDisplayCommand(args)).toContain("'/path/to project:/app'");
  });
});
