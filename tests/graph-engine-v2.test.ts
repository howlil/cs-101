import {test} from 'node:test';
import assert from 'node:assert/strict';
import manifest from '../curriculum/manifest.v2.json';
import overlay from '../curriculum/learning-graph.v2.json';
import {buildCurriculumGraph} from '../src/domain/curriculum-v2/graph';
import {buildLearningGraph} from '../src/domain/learning-graph';
import {planLearningGoal} from '../src/domain/learning-planner';
import {reportGraphCoverage} from '../src/domain/graph-coverage';
const curriculum=buildCurriculumGraph(manifest);
const graph=buildLearningGraph(overlay,curriculum);

test('curriculum remains 370 canonical units and new graph maps all authored units',()=>{
  const published=new Set(['JAV-001','NET-001','NET-006','OSX-029','PRD-002','SPR-006','SQL-001','SYS-008','TST-007','TST-019','TST-020','TST-021','TST-022','TST-023','TST-024','TST-025']);
  const c=reportGraphCoverage(graph,published);
  assert.equal(c.totalItems,370);
  assert.equal(c.totalConcepts,14);
  assert.equal(c.competencyOutcomes,16);
  assert.equal(c.mappedItemCount,19);
  assert.equal(c.unmappedPublished.length,0);
  assert.equal(c.reviewedDependencies,2);
  assert.equal(c.byLevel.G3,0);
  assert.equal(c.byLevel.G4,0);
  assert.ok(c.components.length>=1);
});

test('reviewed prerequisites precede testing goal without treating related edges as gates',()=>{
  const plan=planLearningGoal(graph,{conceptId:'api-contract-testing',level:'G1'},new Set(['SYS-008','SPR-006','TST-019','TST-020']));
  assert.deepEqual(plan.steps.map(s=>s.itemId),['SYS-008','SPR-006','SPR-011','TST-019','TST-020']);
  assert.equal(plan.reviewedPrerequisiteCount,1);
  assert.equal(plan.steps[0].reason,'reviewed-prerequisite');
  assert.equal(plan.steps[2].content,'outline');
  assert.equal(plan.publishedCount,4);
  assert.equal(plan.outlineCount,1);
  assert.deepEqual(plan.gaps,[]);
});
test('cross-domain Pact goal resolves transitive reviewed prerequisites without duplicate steps',()=>{
  const plan=planLearningGoal(graph,{conceptId:'provider-contract-verification',level:'G1'},new Set(['TST-021']));
  assert.deepEqual(plan.steps.map(s=>s.itemId),['SYS-008','SPR-006','SPR-011','TST-019','TST-020','TST-021']);
  assert.equal(plan.reviewedPrerequisiteCount,2);
  assert.equal(plan.steps.at(-1)?.reason,'suggested-outcome');
});
test('unmapped level stays an explicit outcome gap and unknown goal fails closed',()=>{
  const missing=planLearningGoal(graph,{conceptId:'provider-contract-verification',level:'G3'},new Set());
  assert.equal(missing.outcomeAvailable,false);
  assert.deepEqual(missing.steps,[]);
  assert.throws(()=>planLearningGoal(graph,{conceptId:'not-in-graph',level:'G1'},new Set()),/Unknown learning goal/);
});
test('invalid, unsupported or cyclic dependency graphs fail closed',()=>{
  const base=overlay.competencyDependencies[0];
  const patch=(deps:unknown[])=>({...overlay,competencyDependencies:deps});
  assert.throws(()=>buildLearningGraph(patch([...overlay.competencyDependencies,base]),curriculum),/Duplicate competency dependency/);
  assert.throws(()=>buildLearningGraph(patch([{...base,from:{conceptId:'not-real',level:'G1'}}]),curriculum),/Unknown competency reference/);
  assert.throws(()=>buildLearningGraph(patch([{...base,sourceItemIds:['JAV-001','TST-019']}]),curriculum),/Dependency source item not mapped|cite both competency outcomes/);
  assert.throws(()=>buildLearningGraph(patch([...overlay.competencyDependencies,{
    ...base,from:base.to,to:base.from,sourceItemIds:['TST-019','SYS-008']}]),curriculum),/Competency prerequisite cycle/);
});
test('proposed dependencies are not gates even when structurally valid',()=>{
  const d={...overlay.competencyDependencies[0],status:'proposed' as const};
  const modified=buildLearningGraph({...overlay,competencyDependencies:[d]},curriculum);
  const plan=planLearningGoal(modified,{conceptId:'api-contract-testing',level:'G1'},new Set());
  assert.deepEqual(plan.steps.map(s=>s.itemId),['SPR-011','TST-019','TST-020']);
});
