import { describe, expect, it } from 'vitest';
import { formatNetworkTable, parseNetworksOutput } from '../src/docker/networks.js';

describe('parseNetworksOutput', () => {
  it('parses one json object per line', () => {
    const output =
      '{"Name":"bridge","Driver":"bridge","Scope":"local"}\n' +
      '{"Name":"my-net","Driver":"macvlan","Scope":"local"}\n';
    expect(parseNetworksOutput(output)).toEqual([
      { name: 'bridge', driver: 'bridge', scope: 'local' },
      { name: 'my-net', driver: 'macvlan', scope: 'local' },
    ]);
  });

  it('ignores empty lines', () => {
    expect(parseNetworksOutput('{"Name":"host","Driver":"host","Scope":"local"}\n\n')).toHaveLength(1);
  });

  it('handles missing fields', () => {
    expect(parseNetworksOutput('{"Name":"x"}')).toEqual([{ name: 'x', driver: '', scope: '' }]);
  });
});

describe('formatNetworkTable', () => {
  it('aligns columns', () => {
    const networks = [
      { name: 'bridge', driver: 'bridge', scope: 'local' },
      { name: 'my-net', driver: 'macvlan', scope: 'local' },
    ];
    expect(formatNetworkTable(networks)).toBe(
      'NAME    DRIVER   SCOPE\nbridge  bridge   local\nmy-net  macvlan  local',
    );
  });

  it('renders an empty table with headers only', () => {
    expect(formatNetworkTable([])).toBe('NAME  DRIVER  SCOPE');
  });
});