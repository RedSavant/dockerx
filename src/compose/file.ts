import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const COMPOSE_FILE_NAMES = ['compose.yaml', 'compose.yml', 'docker-compose.yml'] as const;

export function findComposeFile(dir: string): string | undefined {
  for (const name of COMPOSE_FILE_NAMES) {
    try {
      readFileSync(join(dir, name));
      return join(dir, name);
    } catch {
      // not present, try the next name
    }
  }
  return undefined;
}

export function readComposeFile(file: string): string {
  return readFileSync(file, 'utf8');
}

export function writeComposeFile(file: string, content: string): void {
  writeFileSync(file, content);
}