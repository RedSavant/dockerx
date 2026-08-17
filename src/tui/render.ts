const RESET = '\x1b[0m';

const wrap = (code: string, text: string): string => `\x1b[${code}m${text}${RESET}`;

export const style = {
  bold: (text: string): string => wrap('1', text),
  dim: (text: string): string => wrap('2', text),
  cyan: (text: string): string => wrap('36', text),
  green: (text: string): string => wrap('32', text),
  yellow: (text: string): string => wrap('33', text),
  red: (text: string): string => wrap('31', text),
  inverse: (text: string): string => wrap('7', text),
  highlighted: (text: string): string => `\x1b[44m\x1b[97m\x1b[1m${text}${RESET}`,
};

export function formatCount(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}k`;
  return String(value);
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}

export class Screen {
  private renderedLines = 0;

  render(lines: string[]): void {
    if (this.renderedLines > 0) {
      process.stdout.write(`\x1b[${this.renderedLines}A\x1b[J`);
    }
    if (lines.length > 0) {
      process.stdout.write(`${lines.join('\n')}\n`);
    }
    this.renderedLines = lines.length;
  }
}
