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
const ESCAPE_TIMEOUT_MS = 80;

const CSI_MAP: Record<string, Key> = {
  A: { name: 'up' },
  B: { name: 'down' },
  C: { name: 'right' },
  D: { name: 'left' },
  H: { name: 'home' },
  F: { name: 'end' },
  Z: { name: 'tab-back' },
};

function parseKeySequence(buffer: Buffer): { key: Key; length: number } | null {
  if (buffer.length === 0) return null;
  const first = buffer[0];

  if (first !== ESCAPE) {
    switch (first) {
      case 0x03:
        return { key: { name: 'ctrl-c' }, length: 1 };
      case 0x0d:
      case 0x0a:
        return { key: { name: 'enter' }, length: 1 };
      case 0x09:
        return { key: { name: 'tab' }, length: 1 };
      case 0x7f:
      case 0x08:
        return { key: { name: 'backspace' }, length: 1 };
      case 0x20:
        return { key: { name: 'space' }, length: 1 };
      default: {
        if (first < 0x20) return { key: { name: 'char', char: '' }, length: 1 };
        const char = new TextDecoder().decode(buffer).charAt(0) ?? '';
        return { key: { name: 'char', char }, length: char === '' ? 1 : Buffer.byteLength(char) };
      }
    }
  }

  if (buffer.length === 1) return null;

  const second = buffer[1];
  if (second === 0x5b || second === 0x4f) {
    if (buffer.length < 3) return null;
    const code = String.fromCharCode(buffer[2]);
    const mapped = CSI_MAP[code];
    if (mapped) return { key: mapped, length: 3 };
    if (code === '3' && buffer[3] === 0x7e) return { key: { name: 'delete' }, length: 4 };
    return { key: { name: 'char', char: '' }, length: 3 };
  }

  return { key: { name: 'escape' }, length: 1 };
}

export function parseKeyBuffer(buffer: Buffer): Key | null {
  return parseKeySequence(buffer)?.key ?? null;
}

let pendingInput = Buffer.alloc(0);
let pendingEscapeTimer: NodeJS.Timeout | undefined;

export async function readKey(): Promise<Key> {
  const leftover = parseKeySequence(pendingInput);
  if (leftover) {
    pendingInput = pendingInput.subarray(leftover.length);
    return leftover.key;
  }

  return new Promise((resolve, reject) => {
    const stdin = process.stdin;

    const cleanup = (): void => {
      clearTimeout(pendingEscapeTimer);
      stdin.off('data', onData);
      stdin.off('error', onError);
    };

    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };

    const onData = (chunk: Buffer): void => {
      pendingInput = Buffer.concat([pendingInput, chunk]);
      const parsed = parseKeySequence(pendingInput);
      if (parsed) {
        pendingInput = pendingInput.subarray(parsed.length);
        cleanup();
        resolve(parsed.key);
        return;
      }
      clearTimeout(pendingEscapeTimer);
      if (pendingInput.length === 1 && pendingInput[0] === ESCAPE) {
        pendingEscapeTimer = setTimeout(() => {
          pendingInput = Buffer.alloc(0);
          cleanup();
          resolve({ name: 'escape' });
        }, ESCAPE_TIMEOUT_MS);
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

export interface KeyQueue {
  next(): Promise<Key>;
  close(): void;
}

export function createKeyQueue(): KeyQueue {
  const queue: Key[] = [];
  let chunks: Buffer[] = [];
  let resolver: ((key: Key) => void) | null = null;
  let escapeTimer: NodeJS.Timeout | undefined;
  let closed = false;

  const deliver = (key: Key): void => {
    if (resolver) {
      const resolve = resolver;
      resolver = null;
      resolve(key);
    } else {
      queue.push(key);
    }
  };

  const flush = (): void => {
    let buffer = Buffer.concat(chunks);
    chunks = [];
    let parsed = parseKeySequence(buffer);
    while (parsed) {
      deliver(parsed.key);
      buffer = buffer.subarray(parsed.length);
      parsed = parseKeySequence(buffer);
    }
    if (buffer.length > 0) chunks = [buffer];
  };

  const onData = (chunk: Buffer): void => {
    if (closed) return;
    chunks.push(chunk);
    clearTimeout(escapeTimer);
    flush();
    if (chunks.length === 1 && chunks[0].length === 1 && chunks[0][0] === ESCAPE) {
      escapeTimer = setTimeout(() => {
        chunks = [];
        deliver({ name: 'escape' });
      }, ESCAPE_TIMEOUT_MS);
    }
  };

  const onError = (): void => {
    deliver({ name: 'escape' });
  };

  const next = (): Promise<Key> => {
    if (closed) return Promise.resolve({ name: 'escape' });
    if (queue.length > 0) return Promise.resolve(queue.shift() as Key);
    return new Promise((resolve) => {
      resolver = resolve;
    });
  };

  const close = (): void => {
    closed = true;
    clearTimeout(escapeTimer);
    process.stdin.off('data', onData);
    process.stdin.off('error', onError);
    if (resolver) {
      const resolve = resolver;
      resolver = null;
      resolve({ name: 'escape' });
    }
  };

  process.stdin.resume();
  process.stdin.on('data', onData);
  process.stdin.on('error', onError);

  return { next, close };
}