import source from '../../curriculum/manifest.v2.json';
import { buildCurriculumGraph } from '../domain/curriculum-v2/graph';
import { toLegacyManifestV1 } from '../domain/curriculum-v2/legacy';

export const curriculumGraph = buildCurriculumGraph(source);
export const curriculum = toLegacyManifestV1(curriculumGraph);

// Temporary compatibility export for lesson/content code that still speaks Task V1.
export const tasks = [...curriculum.tasks].sort((a, b) => a.order - b.order);
