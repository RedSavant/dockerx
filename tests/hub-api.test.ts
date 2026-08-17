import { describe, expect, it } from 'vitest';
import {
  buildLibraryUrl,
  buildSearchUrl,
  mapLibraryResults,
  mapSearchResults,
} from '../src/docker/hub-api.js';
import { formatCount } from '../src/tui/render.js';

describe('buildSearchUrl', () => {
  it('adds the query and the page size', () => {
    const url = buildSearchUrl('nginx', 15);
    expect(url).toContain('/v2/search/repositories/?');
    expect(url).toContain('query=nginx');
    expect(url).toContain('page_size=15');
  });

  it('omits an empty query', () => {
    expect(buildSearchUrl('  ', 15)).not.toContain('query=');
  });
});

describe('buildLibraryUrl', () => {
  it('points to the library repositories', () => {
    expect(buildLibraryUrl(20)).toContain('/v2/repositories/library/?page_size=20');
  });
});

describe('mapSearchResults', () => {
  it('maps api results to hub images', () => {
    const payload = {
      results: [
        {
          repo_name: 'nginx',
          short_description: 'Official build of Nginx.',
          star_count: 21358,
          pull_count: 13265705093,
          is_official: true,
        },
      ],
    };
    expect(mapSearchResults(payload)).toEqual([
      { name: 'nginx', description: 'Official build of Nginx.', stars: 21358, pulls: 13265705093, official: true },
    ]);
  });

  it('handles missing descriptions', () => {
    const payload = {
      results: [{ repo_name: 'x', short_description: null, star_count: 0, pull_count: 0, is_official: false }],
    };
    expect(mapSearchResults(payload)[0].description).toBe('');
  });

  it('returns an empty list without results', () => {
    expect(mapSearchResults({})).toEqual([]);
  });
});

describe('mapLibraryResults', () => {
  it('maps library results to hub images', () => {
    const payload = {
      results: [
        { name: 'ubuntu', description: 'Ubuntu is a Debian-based Linux.', star_count: 17864, pull_count: 10011076399, is_official: true },
      ],
    };
    expect(mapLibraryResults(payload)).toEqual([
      { name: 'ubuntu', description: 'Ubuntu is a Debian-based Linux.', stars: 17864, pulls: 10011076399, official: true },
    ]);
  });
});

describe('formatCount', () => {
  it('formats large numbers', () => {
    expect(formatCount(13265705093)).toBe('13.3B');
    expect(formatCount(10011076399)).toBe('10.0B');
    expect(formatCount(21358)).toBe('21.4k');
    expect(formatCount(500)).toBe('500');
  });
});