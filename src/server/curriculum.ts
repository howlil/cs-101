import source from '../../curriculum/manifest.v2.json';
import { buildCurriculumGraph } from '../domain/curriculum-v2/graph';
import { buildCurriculumSearchIndex } from '../domain/curriculum-v2/selectors';

export const curriculumGraph = buildCurriculumGraph(source);
export const curriculumSearchIndex = buildCurriculumSearchIndex(curriculumGraph);
