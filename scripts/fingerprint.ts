import manifestSource from '../curriculum/manifest.v2.json';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';

const graph = buildCurriculumGraph(manifestSource);
const itemId = process.argv[2];
const item = itemId ? graph.itemsById.get(itemId) : undefined;

if (!item) {
  throw new Error('Gunakan: pnpm exec tsx scripts/fingerprint.ts <ITEM-ID>');
}

console.log(item.fingerprint);
