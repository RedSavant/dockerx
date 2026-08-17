export type Key =
  | {
      name:
        | 'up'
        | 'down'
        | 'left'
        | 'right'
        | 'enter'
        | 'tab'
        | 'tab-back'
        | 'backspace'
        | 'escape'
        | 'space'
        | 'home'
        | 'end'
        | 'delete'
        | 'ctrl-c';
    }
  | { name: 'char'; char: string };

const ESCAPE = 0x1b;

const CSI_MAP: Record<string, Key> = {
  A: { name: 'up' },
  B: { name: 'down' },
  C: { name: 'right' },
  D: { name: 'left' },
  H: { name: 'home' },
  F: { name: 'end' },
  Z: { name: 'tab-back' },
};

export function parseKeyBuffer(buffer: Buffer): Key | null {
  if (buffer.length === 0) return null;
  const first = buffer[0];

  if (first !== ESCAPE) {
    switch (first) {
      case 0x03:
        return { name: 'ctrl-c' };
      case 0x0d:
      case 0x0a:
        return { name: 'enter' };
      case 0x09:
        return { name: 'tab' };
      case 0x7f:
      case 0x08:
        return { name: 'backspace' };
      case 0x20:
        return { name: 'space' };
      default:
        if (first < 0x20) return { name: 'char', char: '' };
        return { name: 'char', char: new TextDecoder().decode(buffer).charAt(0) ?? '' };
    }
  }

  if (buffer.length === 1) return null;

  const second = buffer[1];
  if (second === 0x5b || second === 0x4f) {
    if (buffer.length < 3) return null;
    const code = String.fromCharCode(buffer[2]);
    const mapped = CSI_MAP[code];
    if (mapped) return mapped;
    if (code === '3' && buffer[3] === 0x7e) return { name: 'delete' };
    return { name: 'char', char: '' };
  }

  return { name: 'escape' };
}

export async function readKey(): Promise<Key> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const chunks: Buffer[] = [];
    let escapeTimer: NodeJS.Timeout | undefined;

    const cleanup = (): void => {
      clearTimeout(escapeTimer);
      stdin.off('data', onData);
      stdin.off('error', onError);
    };

    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };

    const onData = (chunk: Buffer): void => {
      chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      const key = parseKeyBuffer(buffer);
      if (key) {
        cleanup();
        resolve(key);
        return;
      }
      clearTimeout(escapeTimer);
      if (buffer.length === 1 && buffer[0] === ESCAPE) {
        escapeTimer = setTimeout(() => {
          cleanup();
          resolve({ name: 'escape' });
        }, 80);
      }
    };

    stdin.resume();
    stdin.on('data', onData);
    stdin.on('error', onError);
  });
}

export async function withRawMode<T>(task: () => Promise<T>): Promise<T> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Interactive mode requires a terminal.');
  }
  process.stdin.setRawMode(true);
  process.stdout.write('\x1b[?25l');
  try {
    return await task();
  } finally {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write('\x1b[?25h');
  }
}
