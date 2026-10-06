import source from '../../curriculum/manifest.json';
import { parseManifest } from '../domain/curriculum';

export const curriculum = parseManifest(source);
export const tasks = [...curriculum.tasks].sort((a, b) => a.order - b.order);
