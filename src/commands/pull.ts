import { requireDocker, runDocker } from '../docker/docker-executor.js';
import { popularImages, searchImages, type HubImage } from '../docker/hub-api.js';
import { formatCount, style, truncate } from '../tui/render.js';
import { searchableList, type SearchItem } from '../tui/searchable-list.js';

function toItems(images: HubImage[]): SearchItem[] {
  return images.map((image) => ({
    value: image.name,
    label: image.name,
    hint: [
      image.description ? truncate(image.description, 55) : '',
      image.official ? 'official' : '',
      `★ ${formatCount(image.stars)} · ${formatCount(image.pulls)} pulls`,
    ]
      .filter(Boolean)
      .join('  '),
  }));
}

export async function pullImage(): Promise<void> {
  const image = await searchableList({
    title: 'Pull an image from Docker Hub',
    promptLabel: 'Search',
    initialLoad: async () => toItems(await popularImages()),
    onSearch: async (query) => {
      if (query.trim() === '') return [];
      return toItems(await searchImages(query));
    },
  });

  if (!image) return;

  await requireDocker();

  console.log(style.green(`\nPulling ${image}…`));
  const exitCode = await runDocker(['pull', image]);
  if (exitCode === 0) {
    console.log(style.green(`Done: ${image} is now available locally.`));
  } else {
    process.exitCode = exitCode;
  }
}