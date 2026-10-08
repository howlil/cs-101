import source from '../../curriculum/manifest.v2.json';
import { buildCurriculumGraph } from '../domain/curriculum-v2/graph';
import { toLegacyManifestV1 } from '../domain/curriculum-v2/legacy';
import { buildCurriculumSearchIndex, itemHref } from '../domain/curriculum-v2/selectors';

export const curriculumGraph = buildCurriculumGraph(source);
export const curriculum = toLegacyManifestV1(curriculumGraph);

// Temporary compatibility export for lesson/content code that still speaks Task V1.
export const tasks = [...curriculum.tasks].sort((a, b) => a.order - b.order);

// Immutable curriculum data is built once per Worker isolate, not on each SSR request.
export const curriculumSearchIndex = buildCurriculumSearchIndex(curriculumGraph);
export const curriculumSearchEntries = curriculumSearchIndex.map((entry) => ({
  ...entry,
  href: itemHref(curriculumGraph, entry.itemId),
}));
