import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import manifest from '../curriculum/manifest.v2.json';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { validatePedagogySpec } from '../src/domain/generation/pedagogy';
import { contentCriteriaForItem } from '../src/domain/generation/criteria';

const graph = buildCurriculumGraph(manifest);
const fixture = JSON.parse(readFileSync('generation/pedagogy/JAV-001.json', 'utf8')) as {
  unitId: string;
  curriculumFingerprint: string;
  pedagogy: Parameters<typeof validatePedagogySpec>[2];
};
const copy = () => structuredClone(fixture.pedagogy) as any;

test('JAV-001 scaffolded pilot covers unchanged acceptance criteria and real project bridge', () => {
  const unit = graph.itemsById.get(fixture.unitId);
  assert.ok(unit && unit.kind === 'unit');
  assert.equal(unit.fingerprint, fixture.curriculumFingerprint);
  const parsed = validatePedagogySpec(graph, fixture.unitId, fixture.pedagogy);
  const covered = new Set(parsed.segments.flatMap((segment) => segment.independentChallenge.criterionIds));
  assert.deepEqual(
    [...covered].sort(),
    contentCriteriaForItem(unit).map((criterion) => criterion.id).sort(),
  );
  assert.equal(parsed.segments.length, 5);
  assert.equal(parsed.projectBridge?.checkpointId, 'JAV-P01');
});

test('reject missing criterion and duplicate segment identities', () => {
  const uncovered = copy();
  uncovered.segments = uncovered.segments.filter((segment: any) => segment.id !== 'deterministic-cli');
  assert.throws(() => validatePedagogySpec(graph, fixture.unitId, uncovered), /criterion belum tercakup/);
  const duplicates = copy();
  duplicates.segments[1].id = duplicates.segments[0].id;
  assert.throws(() => validatePedagogySpec(graph, fixture.unitId, duplicates), /Segment ID duplikat/);
});

test('reject project mapping based on unrelated checkpoint or fabricated requirement', () => {
  const unrelated = copy();
  unrelated.projectBridge.checkpointId = 'JAV-P02';
  assert.throws(() => validatePedagogySpec(graph, fixture.unitId, unrelated), /contributes_to eksplisit/);
  const requirement = copy();
  requirement.projectBridge.requirementIds = ['invented-requirement'];
  assert.throws(() => validatePedagogySpec(graph, fixture.unitId, requirement), /Project requirement tidak dikenal/);
});

test('guided practice requires usable hints and an independent challenge', () => {
  const noHints = copy();
  noHints.segments[0].guidedPractice.hints = [];
  assert.throws(() => validatePedagogySpec(graph, fixture.unitId, noHints));
  const unknown = copy();
  unknown.segments[0].independentChallenge.criterionIds = ['unknown'];
  assert.throws(() => validatePedagogySpec(graph, fixture.unitId, unknown), /Criterion segment tidak dikenal/);
});

test('do not couple non-persistent pedagogical content to learner states', () => {
  const component = readFileSync('src/components/lesson/GuidedPractice.tsx', 'utf8');
  const generator = readFileSync('src/domain/generation/pedagogy.ts', 'utf8');
  assert.doesNotMatch(component, /localStorage|sessionStorage|fetch\s*\(|indexedDB/i);
  assert.doesNotMatch(generator, /learnerId|userId|reviewDueDate|progressStore/);
});
