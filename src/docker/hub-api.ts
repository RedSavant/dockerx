export interface HubImage {
  name: string;
  description: string;
  stars: number;
  pulls: number;
  official: boolean;
}

interface SearchResult {
  repo_name: string;
  short_description: string | null;
  star_count: number;
  pull_count: number;
  is_official: boolean;
}

interface LibraryResult {
  name: string;
  description: string | null;
  star_count: number;
  pull_count: number;
  is_official: boolean;
}

const HUB_API = 'https://hub.docker.com';
const SEARCH_PAGE_SIZE = 15;
const POPULAR_PAGE_SIZE = 20;
const TIMEOUT_MS = 10_000;

export function buildSearchUrl(query: string, pageSize: number): string {
  const params = new URLSearchParams({ page_size: String(pageSize) });
  if (query.trim() !== '') {
    params.set('query', query.trim());
  }
  return `${HUB_API}/v2/search/repositories/?${params.toString()}`;
}

export function buildLibraryUrl(pageSize: number): string {
  return `${HUB_API}/v2/repositories/library/?page_size=${pageSize}`;
}

export function mapSearchResults(payload: unknown): HubImage[] {
  const results = (payload as { results?: SearchResult[] }).results ?? [];
  return results.map((result) => ({
    name: result.repo_name,
    description: result.short_description ?? '',
    stars: result.star_count,
    pulls: result.pull_count,
    official: result.is_official,
  }));
}

export function mapLibraryResults(payload: unknown): HubImage[] {
  const results = (payload as { results?: LibraryResult[] }).results ?? [];
  return results.map((result) => ({
    name: result.name,
    description: result.description ?? '',
    stars: result.star_count,
    pulls: result.pull_count,
    official: result.is_official,
  }));
}

export async function searchImages(query: string): Promise<HubImage[]> {
  const response = await fetch(buildSearchUrl(query, SEARCH_PAGE_SIZE), {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Docker Hub API answered with HTTP ${response.status}.`);
  }
  return mapSearchResults(await response.json());
}

export async function popularImages(): Promise<HubImage[]> {
  const response = await fetch(buildLibraryUrl(POPULAR_PAGE_SIZE), {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Docker Hub API answered with HTTP ${response.status}.`);
  }
  return mapLibraryResults(await response.json());
}