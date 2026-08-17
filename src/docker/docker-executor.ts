import { spawn } from 'node:child_process';

export async function checkDockerAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('docker', ['--version'], { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('exit', (code) => resolve(code === 0));
  });
}

export async function requireDocker(): Promise<void> {
  const available = await checkDockerAvailable();
  if (!available) {
    throw new Error(
      'Docker is not available. Install Docker and make sure the daemon is running (try "docker --version").',
    );
  }
}

export async function runDockerOutput(args: string[]): Promise<{ code: number; stdout: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { stdio: ['ignore', 'pipe', 'inherit'] });
    const chunks: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    child.on('error', reject);
    child.on('exit', (code) => {
      resolve({ code: code ?? 1, stdout: Buffer.concat(chunks).toString('utf8') });
    });
  });
}

export function runDocker(args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { stdio: 'inherit' });

    const forwardSignal = (signal: NodeJS.Signals): void => {
      child.kill(signal);
    };

    process.on('SIGINT', forwardSignal);
    process.on('SIGTERM', forwardSignal);

    child.on('error', (error) => {
      process.off('SIGINT', forwardSignal);
      process.off('SIGTERM', forwardSignal);
      reject(error);
    });

    child.on('exit', (code, signal) => {
      process.off('SIGINT', forwardSignal);
      process.off('SIGTERM', forwardSignal);
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }
      resolve(code ?? 1);
    });
  });
}
