import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import manifest from '../curriculum/manifest.v2.json';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { checkPublishedV3Files } from '../src/domain/generation/verification';
import { executablePlanSchema } from '../src/domain/generation/executable-schema';
import { executeExamples } from './lib/executable-proof';

const graph = buildCurriculumGraph(manifest);
const directory = resolve('generation','verified');
let verified = 0;
let nonExecutable = 0;

if (existsSync(directory)) for (const name of readdirSync(directory)) {
  if (!name.endsWith('.json')) continue;
  const id = name.slice(0,-5);
  const item = graph.itemsById.get(id);
  if (!item || item.kind !== 'unit') throw new Error('Receipt untuk unit tidak valid: ' + id);
  checkPublishedV3Files(process.cwd(), id, item.fingerprint);
  const plan = executablePlanSchema.parse(JSON.parse(
    readFileSync(resolve('generation', 'executables', id + '.json'), 'utf8'),
  ));
  const expected = JSON.parse(readFileSync(resolve('generation', 'proofs', id + '.json'), 'utf8'));
  if (plan.itemId !== id || plan.curriculumFingerprint !== item.fingerprint) {
    throw new Error('Executable plan stale: ' + id);
  }
  const actual = executeExamples(plan, resolve('generation','fixtures',id));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error('Published executable proof mismatch: ' + id);
  }
  if (actual.status === 'verified') verified++;
  else nonExecutable++;
}
console.log('Executable verification: ' + verified + ' units with passing fixtures; ' +
  nonExecutable + ' units explicitly marked not executable.');
