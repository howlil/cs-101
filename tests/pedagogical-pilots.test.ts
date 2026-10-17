import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import manifest from '../curriculum/manifest.v2.json';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { validatePedagogySpec } from '../src/domain/generation/pedagogy';
import { contentCriteriaForItem } from '../src/domain/generation/criteria';

const graph = buildCurriculumGraph(manifest);
const pilots = [
  { id: 'JAV-001', project: 'JAV-P01' },
  { id: 'JAV-002', project: 'JAV-P01' },
  { id: 'SQL-001', project: 'SQL-P01' },
] as const;

for (const { id, project } of pilots) {
  test(id + ': scaffolded metadata retains curriculum criteria and verified project link', () => {
    const record = JSON.parse(readFileSync('generation/pedagogy/' + id + '.json', 'utf8'));
    const unit = graph.itemsById.get(id);
    assert.ok(unit && unit.kind === 'unit');
    assert.equal(record.unitId, id);
    assert.equal(record.curriculumFingerprint, unit.fingerprint);
    const spec = validatePedagogySpec(graph, id, record.pedagogy);
    assert.equal(spec.segments.length, 5);
    assert.equal(spec.projectBridge?.checkpointId, project);
    const covered = new Set(spec.segments.flatMap((segment) => segment.independentChallenge.criterionIds));
    const expected = contentCriteriaForItem(unit).map((criterion) => criterion.id);
    assert.deepEqual([...covered].sort(), [...expected].sort());
    assert.ok(spec.segments.every((segment) =>
      segment.workedExample.steps.length > 0 && segment.guidedPractice.hints.length >= 2
    ));
    const mdx = readFileSync('src/content/lessons/' + id + '.mdx', 'utf8');
    assert.ok(mdx.includes('<WorkedExample'));
    assert.ok(mdx.includes('<GuidedPractice'));
    assert.ok(mdx.includes('<ProjectContribution'));
    assert.ok(mdx.includes('checkpointId="' + project + '"'));
    assert.ok(mdx.includes('curriculumFingerprint: "' + unit.fingerprint + '"'));
  });
}

test('regression: transfer exercise must not copy guided-practice prompt', () => {
  const record = JSON.parse(readFileSync('generation/pedagogy/JAV-002.json', 'utf8'));
  const repeated = structuredClone(record.pedagogy);
  repeated.segments[0].independentChallenge.prompt = repeated.segments[0].guidedPractice.prompt;
  assert.throws(
    () => validatePedagogySpec(graph, 'JAV-002', repeated),
    /Independent challenge harus berbeda/,
  );
});

test('SQL-001 preserves the original quantitative success criteria in its published lesson', () => {
  const mdx = readFileSync('src/content/lessons/SQL-001.mdx', 'utf8');
  assert.match(mdx, /18\/20/);
  assert.match(mdx, /psql/);
  assert.match(mdx, /ORDER BY/);
  assert.doesNotMatch(mdx, /<form|<input|streak|XP points/i);
});

test('JAV-002 keeps its strong independent acceptance criteria', () => {
  const mdx = readFileSync('src/content/lessons/JAV-002.mdx', 'utf8');
  assert.match(mdx, /10\.000/);
  assert.match(mdx, /HashMap/);
  assert.match(mdx, /HashSet/);
  assert.match(mdx, /hashCode/);
});
