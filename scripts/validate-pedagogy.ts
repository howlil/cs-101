import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import manifest from '../curriculum/manifest.v2.json';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { validatePedagogySpec } from '../src/domain/generation/pedagogy';

const graph = buildCurriculumGraph(manifest);
let count = 0;
for (const entry of readdirSync('generation/pedagogy', { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
  const id = entry.name.slice(0, -5);
  const record = JSON.parse(readFileSync(join('generation/pedagogy', entry.name), 'utf8'));
  if (record.unitId !== id || record.curriculumFingerprint !== graph.itemsById.get(id)?.fingerprint) {
    throw new Error('Pedagogy fingerprint atau item ID tidak cocok: ' + id);
  }
  validatePedagogySpec(graph, id, record.pedagogy);
  count++;
}
console.log('Pedagogy validation: ' + count + ' authored pilot(s).');
