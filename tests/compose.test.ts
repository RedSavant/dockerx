import { describe, expect, it } from 'vitest';
import { generateComposeYaml, serviceName } from '../src/compose/generator.js';
import { parseComposeYaml } from '../src/compose/parser.js';
import type { ComposeProject } from '../src/compose/types.js';

function service(overrides: Partial<ComposeProject['services'][number]> = {}): ComposeProject['services'][number] {
  return {
    image: 'node:22',
    name: undefined,
    ports: [],
    volumes: [],
    envVars: [],
    interactive: false,
    command: undefined,
    dependsOn: [],
    restart: undefined,
    workingDir: undefined,
    ...overrides,
  };
}

describe('generateComposeYaml', () => {
  it('renders a minimal service', () => {
    expect(generateComposeYaml({ services: [service({ image: 'alpine:3' })] })).toBe(
      'services:\n  alpine:\n    image: alpine:3\n',
    );
  });

  it('renders a full service', () => {
    const project: ComposeProject = {
      services: [
        service({
          image: 'node:22',
          name: 'my-app',
          ports: [{ local: 3000, container: 3000 }],
          volumes: [{ local: './project', container: '/app' }],
          envVars: [{ name: 'NODE_ENV', value: 'development' }, { name: 'PORT', value: '3000' }],
          interactive: true,
          command: 'npm start',
          dependsOn: ['db'],
          restart: 'always',
          workingDir: '/app',
        }),
      ],
    };
    expect(generateComposeYaml(project)).toBe(
      'services:\n' +
        '  my-app:\n' +
        '    image: node:22\n' +
        '    container_name: my-app\n' +
        '    ports:\n' +
        '      - "3000:3000"\n' +
        '    volumes:\n' +
        '      - ./project:/app\n' +
        '    environment:\n' +
        '      NODE_ENV: development\n' +
        '      PORT: "3000"\n' +
        '    stdin_open: true\n' +
        '    tty: true\n' +
        '    command: npm start\n' +
        '    depends_on:\n' +
        '      - db\n' +
        '    restart: always\n' +
        '    working_dir: /app\n',
    );
  });

  it('omits empty optional sections', () => {
    const yaml = generateComposeYaml({ services: [service()] });
    expect(yaml).not.toContain('ports:');
    expect(yaml).not.toContain('container_name:');
    expect(yaml).not.toContain('depends_on:');
  });

  it('quotes port mappings', () => {
    const yaml = generateComposeYaml({
      services: [service({ ports: [{ local: 8080, container: 80 }] })],
    });
    expect(yaml).toContain('      - "8080:80"');
  });
});

describe('serviceName', () => {
  it('uses the container name when set', () => {
    expect(serviceName(service({ name: 'web' }))).toBe('web');
  });

  it('falls back to the image name without the tag', () => {
    expect(serviceName(service({ image: 'postgres:16' }))).toBe('postgres');
  });
});

describe('parseComposeYaml', () => {
  it('parses a generated file back (round-trip)', () => {
    const project: ComposeProject = {
      services: [
        service({
          image: 'node:22',
          name: 'my-app',
          ports: [{ local: 3000, container: 3000 }],
          volumes: [{ local: './project', container: '/app' }],
          envVars: [{ name: 'NODE_ENV', value: 'development' }],
          interactive: true,
          command: 'npm start',
          dependsOn: ['db'],
          restart: 'on-failure',
          workingDir: '/app',
        }),
        service({ image: 'postgres:16', envVars: [{ name: 'POSTGRES_PASSWORD', value: 'secret' }] }),
      ],
    };
    expect(parseComposeYaml(generateComposeYaml(project))).toEqual(project);
  });

  it('parses a hand-written file with list-style environment', () => {
    const parsed = parseComposeYaml(
      'services:\n' +
        '  web:\n' +
        '    image: nginx\n' +
        '    environment:\n' +
        '      - NODE_ENV=production\n' +
        '    depends_on:\n' +
        '      - db\n' +
        '    stdin_open: true\n',
    );
    expect(parsed).toEqual({
      services: [
        {
          image: 'nginx',
          name: undefined,
          ports: [],
          volumes: [],
          envVars: [{ name: 'NODE_ENV', value: 'production' }],
          interactive: true,
          command: undefined,
          dependsOn: ['db'],
          restart: undefined,
          workingDir: undefined,
        },
      ],
    });
  });

  it('parses an array command', () => {
    const parsed = parseComposeYaml(
      'services:\n  web:\n    image: nginx\n    command: ["nginx", "-g", "daemon off;"]\n',
    );
    expect(parsed.services[0].command).toBe('nginx -g daemon off;');
  });

  it('rejects files without services', () => {
    expect(() => parseComposeYaml('version: "3"\n')).toThrow(/services/);
    expect(() => parseComposeYaml('services: {}\n')).toThrow(/service/);
  });
});