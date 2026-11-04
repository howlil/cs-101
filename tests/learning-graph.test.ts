import { test } from 'node:test';
import assert from 'node:assert/strict';
import manifest from '../curriculum/manifest.v2.json';
import overlay from '../curriculum/learning-graph.v1.json';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { buildLearningGraph, conceptsForItem, getFocusedConcept, learningGraphHref } from '../src/domain/learning-graph';

const curriculum = buildCurriculumGraph(manifest);

test('pilot graph uses 4 real domains without mutating 370 source units', () => {
  const graph = buildLearningGraph(overlay, curriculum);
  const focus = getFocusedConcept(graph, 'http-request-lifecycle');
  assert.equal(curriculum.manifest.items.length, 370);
  assert.deepEqual(focus.applications.map((a) => a.itemId), ['NET-001', 'SPR-006', 'OSX-029', 'PRD-002']);
  assert.equal(new Set(focus.applications.map((a) => a.trackTitle)).size, 4);
  assert.equal(focus.neighbors.length, 4);
  assert.ok(graph.relations.every((r) => r.type === 'related' && r.status === 'proposed'));
  assert.deepEqual(conceptsForItem(graph, 'SPR-006').map((c) => c.id), ['http-request-lifecycle', 'http-controller']);
});

test('unknown deep links recover to a valid concept', () => {
  const graph = buildLearningGraph(overlay, curriculum);
  assert.equal(getFocusedConcept(graph, 'not-found').concept.id, graph.concepts[0].id);
  assert.equal(learningGraphHref('http-request-lifecycle'), '/?mode=graph&concept=http-request-lifecycle');
});

test('invalid mapping and duplicate connection fail closed', () => {
  assert.throws(() => buildLearningGraph({ ...overlay, applications: [
    ...overlay.applications, { conceptId:'http-request-lifecycle', itemId:'NET-999', role:'foundation' }
  ] }, curriculum), /Unknown learning unit/);
  assert.throws(() => buildLearningGraph({ ...overlay, applications: [
    ...overlay.applications, overlay.applications[0]
  ] }, curriculum), /Duplicate application/);
});

test('unreviewed hard prerequisites and cycles are rejected', () => {
  const edge = { from:'tcp-connection', to:'http-controller', type:'requires', status:'proposed', rationale:'Fixture' };
  assert.throws(() => buildLearningGraph({ ...overlay, relations:[...overlay.relations,edge] }, curriculum), /requires review/);
  assert.throws(() => buildLearningGraph({ ...overlay, relations:[
    ...overlay.relations, { ...edge, status:'reviewed' },
    { from:'http-controller', to:'tcp-connection', type:'requires', status:'reviewed', rationale:'Fixture reverse' }
  ] }, curriculum), /Concept prerequisite cycle/);
});
