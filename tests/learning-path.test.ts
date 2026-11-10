import { test } from 'node:test';
import assert from 'node:assert/strict';
import manifest from '../curriculum/manifest.v2.json';
import overlay from '../curriculum/learning-graph.v2.json';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { buildLearningGraph, getFocusedConcept } from '../src/domain/learning-graph';
import { getLearningPath, getItemPathContext, pathItemHref } from '../src/domain/learning-path';

const curriculum = buildCurriculumGraph(manifest);
const graph = buildLearningGraph(overlay, curriculum);

test('pilot suggested order is deterministic, specific to G1/G2, and contains no invented prerequisites', () => {
  const g1 = getLearningPath(graph, getFocusedConcept(graph, 'http-request-lifecycle', 'G1'));
  const g2 = getLearningPath(graph, getFocusedConcept(graph, 'http-request-lifecycle', 'G2'));
  assert.deepEqual(g1.steps.map((s) => s.itemId), ['NET-001', 'SPR-006', 'OSX-029']);
  assert.deepEqual(g2.steps.map((s) => s.itemId), ['OSX-029', 'PRD-002']);
  assert.equal(g1.reviewedPrerequisiteCount, 0);
  assert.deepEqual(g1.missingPrerequisites, []);
  assert.ok(g1.steps.every((step) => step.reviewedPrerequisite === false));
  assert.equal(getLearningPath(graph, getFocusedConcept(graph, null, 'G3')).steps.length, 0);
});

test('item navigation preserves context through Materi, Soal and Project', () => {
  const first = getItemPathContext(graph, 'http-request-lifecycle', 'G1', 'NET-001');
  assert.equal(first?.index, 1);
  assert.equal(first?.total, 3);
  assert.equal(first?.previous, undefined);
  assert.equal(first?.next?.itemId, 'SPR-006');
  const last = getItemPathContext(graph, 'http-request-lifecycle', 'G1', 'OSX-029');
  assert.equal(last?.index, 3);
  assert.equal(last?.previous?.itemId, 'SPR-006');
  assert.equal(last?.next, undefined);
  assert.equal(pathItemHref('NET-001', 'http-request-lifecycle', 'G1'),
    '/?item=NET-001&concept=http-request-lifecycle&level=G1');
  assert.equal(pathItemHref('NET-001', 'http-request-lifecycle', 'G1', 'soal'),
    '/?item=NET-001&view=soal&concept=http-request-lifecycle&level=G1');
  assert.equal(pathItemHref('NET-001', 'http-request-lifecycle', 'G1', 'project'),
    '/?item=NET-001&view=project&concept=http-request-lifecycle&level=G1');
});

test('invalid context and unrelated curriculum items never acquire a route', () => {
  for (const [concept, level, item] of [
    ['unknown', 'G1', 'NET-001'], ['http-request-lifecycle', 'INVALID', 'NET-001'],
    ['http-request-lifecycle', null, 'NET-001'], ['http-request-lifecycle', 'G1', 'SQL-001'],
    ['tcp-connection', 'G2', 'NET-006'],
  ] as const) {
    assert.equal(getItemPathContext(graph, concept, level, item), undefined);
  }
});

test('topological prerequisite traversal comes before dependents and deduplicates shared units', () => {
  const reviewEdge = (from: string, to: string) =>
    ({ from, to, type: 'requires', status: 'reviewed', rationale: 'Reviewed fixture' });
  const custom = buildLearningGraph({
    ...overlay,
    relations: [...overlay.relations,
      reviewEdge('tcp-connection', 'server-binding'),
      reviewEdge('server-binding', 'http-request-lifecycle'),
    ],
  }, curriculum);
  const path = getLearningPath(custom, getFocusedConcept(custom, 'http-request-lifecycle', 'G1'));
  assert.deepEqual(path.steps.map((s) => s.itemId),
    ['NET-006', 'OSX-029', 'NET-001', 'SPR-006']);
  assert.equal(path.reviewedPrerequisiteCount, 2);
  assert.deepEqual(path.steps.filter((s) => s.reviewedPrerequisite).map((s) => s.itemId),
    ['NET-006', 'OSX-029']);
});

test('missing prerequisite at selected depth stays visible, not silently inherited from G1', () => {
  const custom = buildLearningGraph({
    ...overlay,
    relations: [...overlay.relations, {
      from: 'tcp-connection', to: 'http-request-lifecycle',
      type: 'requires', status: 'reviewed', rationale: 'Fixture',
    }],
  }, curriculum);
  const path = getLearningPath(custom, getFocusedConcept(custom, 'http-request-lifecycle', 'G2'));
  assert.deepEqual(path.steps.map((s) => s.itemId), ['OSX-029', 'PRD-002']);
  assert.deepEqual(path.missingPrerequisites.map((c) => [c.id, ...c.availableLevels]),
    [['tcp-connection', 'G1']]);
});

test('cross-domain study path preserves authored and outline identities without inferred dependencies',()=>{
  const boot=getLearningPath(graph,getFocusedConcept(graph,'java-build-toolchain','G1'));
  const sql=getLearningPath(graph,getFocusedConcept(graph,'relational-schema','G1'));
  const testing=getLearningPath(graph,getFocusedConcept(graph,'api-contract-testing','G1'));
  const design=getLearningPath(graph,getFocusedConcept(graph,'api-design-contract','G1'));
  assert.deepEqual(boot.steps.map(s=>s.itemId),['JAV-001','SPR-001']);
  assert.deepEqual(sql.steps.map(s=>s.itemId),['SQL-001','SQL-006']);
  assert.deepEqual(testing.steps.map(s=>s.itemId),['SYS-008','SPR-006','SPR-011','TST-019','TST-020']);
  assert.deepEqual(design.steps.map(s=>s.itemId),['SYS-008','SPR-006']);
  for(const path of [boot,sql,testing,design]){
    assert.deepEqual(path.missingPrerequisites,[]);
    assert.ok(path.steps.length>0);
  }
  assert.equal(getItemPathContext(graph,'java-build-toolchain','G1','JAV-001')?.next?.itemId,'SPR-001');
  assert.equal(getItemPathContext(graph,'api-design-contract','G1','SPR-006')?.previous?.itemId,'SYS-008');
  assert.equal(getItemPathContext(graph,'api-design-contract','G2','SPR-006'),undefined);
  assert.equal(getItemPathContext(graph,'relational-schema','G1','SPR-006'),undefined);
});
