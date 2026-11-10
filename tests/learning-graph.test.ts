import { test } from 'node:test';
import assert from 'node:assert/strict';
import manifest from '../curriculum/manifest.v2.json';
import overlay from '../curriculum/learning-graph.v2.json';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { buildLearningGraph, conceptsAtLevel, conceptsForItem, getFocusedConcept, learningGraphHref, resolveLearningLevel } from '../src/domain/learning-graph';

const curriculum = buildCurriculumGraph(manifest);

test('pilot retains four canonical domain mappings across competency levels', () => {
  const graph = buildLearningGraph(overlay, curriculum);
  const focus = getFocusedConcept(graph, 'http-request-lifecycle');
  assert.equal(curriculum.manifest.items.length, 370);
  const depthTwo = getFocusedConcept(graph, 'http-request-lifecycle', 'G2');
  assert.deepEqual(focus.applications.map((a) => a.itemId), ['NET-001', 'SPR-006', 'OSX-029']);
  assert.equal(new Set([...focus.applications, ...depthTwo.applications].map((a) => a.trackTitle)).size, 4);
  assert.equal(focus.neighbors.length, 4);
  assert.ok(graph.relations.every((r) => r.type === 'related' && r.status === 'proposed'));
  assert.deepEqual(conceptsForItem(graph, 'SPR-006').map((c) => c.id), ['http-request-lifecycle', 'http-controller', 'api-design-contract']);
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

test('G1 and G2 map different outcomes and units',()=>{
  const graph=buildLearningGraph(overlay,curriculum);
  const g1=getFocusedConcept(graph,'http-request-lifecycle','G1');
  const g2=getFocusedConcept(graph,'http-request-lifecycle','G2');
  assert.notEqual(g1.outcome?.competency,g2.outcome?.competency);
  assert.notEqual(g1.outcome?.evidence,g2.outcome?.evidence);
  assert.deepEqual(g1.applications.map(a=>a.itemId),['NET-001','SPR-006','OSX-029']);
  assert.deepEqual(g2.applications.map(a=>a.itemId),['OSX-029','PRD-002']);
  assert.equal(g1.neighbors.length,4);
  assert.deepEqual(g2.neighbors.map(n=>n.concept.id),['service-readiness']);
  assert.equal(g1.nextOutcome?.level,'G2');
  assert.equal(learningGraphHref('http-request-lifecycle','G2'),'/?mode=graph&concept=http-request-lifecycle&level=G2');
});
test('unmapped depths and concept-depth pairs never synthesize recommendations',()=>{
  const graph=buildLearningGraph(overlay,curriculum);
  assert.equal(conceptsAtLevel(graph,'G3').length,0);
  assert.equal(conceptsAtLevel(graph,'G4').length,0);
  assert.equal(getFocusedConcept(graph,null,'G2').concept.id,'http-request-lifecycle');
  const missing=getFocusedConcept(graph,'tcp-connection','G2');
  assert.equal(missing.outcome,undefined);
  assert.deepEqual(missing.applications,[]);
  assert.deepEqual(missing.neighbors,[]);
  assert.equal(getFocusedConcept(graph,null,'G3').outcome,undefined);
  assert.equal(resolveLearningLevel('invalid'),'G1');
});
test('invalid outcome mapping and duplicate level fail closed',()=>{
  const graph=buildLearningGraph(overlay,curriculum),first=graph.concepts[0];
  const withOutcomes=(outcomes:typeof first.outcomes)=>({...overlay,concepts:overlay.concepts.map(c=>c.id===first.id?{...c,outcomes}:c)});
  assert.throws(()=>buildLearningGraph(withOutcomes([...first.outcomes,first.outcomes[0]]),curriculum),/Duplicate level outcome/);
  assert.throws(()=>buildLearningGraph(withOutcomes([{...first.outcomes[0],itemIds:['NET-999']}]),curriculum),/Outcome item is not mapped/);
  assert.throws(()=>buildLearningGraph(withOutcomes([{...first.outcomes[0],itemIds:['NET-006']}]),curriculum),/Outcome item is not mapped/);
  assert.throws(()=>buildLearningGraph(withOutcomes([{...first.outcomes[0],itemIds:['NET-001','NET-001']}]),curriculum),/Duplicate outcome item/);
});

test('reverse duplicate conceptual relation fails in validation instead of crashing the one-hop canvas',()=>{
  const related={from:'http-request-lifecycle',to:'tcp-connection',type:'related' as const,status:'proposed' as const,rationale:'Existing semantic link fixture'};
  assert.throws(()=>buildLearningGraph({
    ...overlay,
    relations:[...overlay.relations,{...related,from:related.to,to:related.from}]
  },curriculum),/Duplicate concept pair relation/);
});

test('concept link and reviewed prerequisite can coexist without duplicating canvas neighbors',()=>{
  const custom=buildLearningGraph({
    ...overlay,
    relations:[...overlay.relations,{
      from:'server-binding',to:'http-request-lifecycle',type:'requires',
      status:'reviewed',rationale:'Valid legacy prerequisite fixture',
    }]
  },curriculum);
  const focus=getFocusedConcept(custom,'http-request-lifecycle','G1');
  const binding=focus.neighbors.filter(n=>n.concept.id==='server-binding');
  assert.equal(binding.length,1);
  assert.equal(binding[0].relation.type,'requires');
  assert.equal(binding[0].relation.status,'reviewed');
});
