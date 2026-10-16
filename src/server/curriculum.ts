import source from '../../curriculum/manifest.v2.json';
import { buildCurriculumGraph } from '../domain/curriculum-v2/graph';

export const curriculumGraph = buildCurriculumGraph(source);
