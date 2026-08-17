import { describe, expect, it } from 'vitest';
import { parseKeyBuffer } from '../src/tui/keys.js';

describe('parseKeyBuffer', () => {
  it('parses arrow keys', () => {
    expect(parseKeyBuffer(Buffer.from([0x1b, 0x5b, 0x41]))).toEqual({ name: 'up' });
    expect(parseKeyBuffer(Buffer.from([0x1b, 0x5b, 0x42]))).toEqual({ name: 'down' });
    expect(parseKeyBuffer(Buffer.from([0x1b, 0x5b, 0x43]))).toEqual({ name: 'right' });
    expect(parseKeyBuffer(Buffer.from([0x1b, 0x5b, 0x44]))).toEqual({ name: 'left' });
  });

  it('parses ss3 arrow sequences', () => {
    expect(parseKeyBuffer(Buffer.from([0x1b, 0x4f, 0x41]))).toEqual({ name: 'up' });
  });

  it('parses home, end, delete and shift-tab', () => {
    expect(parseKeyBuffer(Buffer.from([0x1b, 0x5b, 0x48]))).toEqual({ name: 'home' });
    expect(parseKeyBuffer(Buffer.from([0x1b, 0x5b, 0x46]))).toEqual({ name: 'end' });
    expect(parseKeyBuffer(Buffer.from([0x1b, 0x5b, 0x33, 0x7e]))).toEqual({ name: 'delete' });
    expect(parseKeyBuffer(Buffer.from([0x1b, 0x5b, 0x5a]))).toEqual({ name: 'tab-back' });
  });

  it('parses simple keys', () => {
    expect(parseKeyBuffer(Buffer.from([0x0d]))).toEqual({ name: 'enter' });
    expect(parseKeyBuffer(Buffer.from([0x09]))).toEqual({ name: 'tab' });
    expect(parseKeyBuffer(Buffer.from([0x20]))).toEqual({ name: 'space' });
    expect(parseKeyBuffer(Buffer.from([0x7f]))).toEqual({ name: 'backspace' });
    expect(parseKeyBuffer(Buffer.from([0x03]))).toEqual({ name: 'ctrl-c' });
  });

  it('parses printable characters', () => {
    expect(parseKeyBuffer(Buffer.from('n'))).toEqual({ name: 'char', char: 'n' });
    expect(parseKeyBuffer(Buffer.from('à'))).toEqual({ name: 'char', char: 'à' });
  });

  it('returns null while an escape sequence is incomplete', () => {
    expect(parseKeyBuffer(Buffer.from([0x1b]))).toBeNull();
    expect(parseKeyBuffer(Buffer.from([0x1b, 0x5b]))).toBeNull();
  });

  it('treats unknown sequences as empty characters', () => {
    expect(parseKeyBuffer(Buffer.from([0x1b, 0x5b, 0x31]))).toEqual({ name: 'char', char: '' });
  });
});