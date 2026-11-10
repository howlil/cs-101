import { test } from 'node:test';
import assert from 'node:assert/strict';
import manifest from '../curriculum/manifest.v2.json';
import overlay from '../curriculum/learning-graph.v2.json';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { buildLearningGraph, assessmentForItem, getFocusedConcept } from '../src/domain/learning-graph';

const curriculum=buildCurriculumGraph(manifest);
const graph=buildLearningGraph(overlay,curriculum);
const customize=(conceptId:string,level:string,modify:(outcome:any)=>any)=>({
  ...overlay,concepts:overlay.concepts.map(concept=>concept.id===conceptId
    ?{...concept,outcomes:concept.outcomes.map(outcome=>outcome.level===level?modify(outcome):outcome)}
    :concept),
});

test('all curated outcomes have nonempty proposed, source-mapped rubrics',()=>{
  const outcomes=graph.concepts.flatMap(concept=>concept.outcomes);
  assert.equal(outcomes.length,16);
  assert.ok(outcomes.every(o=>o.status==='proposed'&&o.assessment.task.trim()!==''));
  for(const outcome of outcomes){
    assert.ok(outcome.assessment.criteria.length>=2);
    assert.equal(new Set(outcome.assessment.criteria.map(c=>c.id)).size,outcome.assessment.criteria.length);
    assert.ok(outcome.assessment.criteria.every(c=>
      outcome.itemIds.includes(c.itemId) && !!c.check.trim() && !!c.passWhen.trim()
      && ['design-review','framework-test','network-lab','packet-trace','cluster-test','cli-build','database-test'].includes(c.evidenceKind)));
  }
});

test('assessments vary by level, expose only criteria mapped to selected unit',()=>{
  const g1=getFocusedConcept(graph,'http-request-lifecycle','G1').outcome!;
  const g2=getFocusedConcept(graph,'http-request-lifecycle','G2').outcome!;
  assert.notEqual(g1.assessment.task,g2.assessment.task);
  const unit=assessmentForItem(graph,'http-request-lifecycle','G2','PRD-002');
  assert.ok(unit?.criteria.some(c=>c.id==='readiness-dependency'));
  assert.ok(unit?.criteria.every(c=>c.itemId==='PRD-002'));
  assert.equal(assessmentForItem(graph,'http-request-lifecycle','G2','SPR-006'),undefined);
  assert.equal(assessmentForItem(graph,'tcp-connection','G2','NET-006'),undefined);
  assert.equal(assessmentForItem(graph,'unknown','G1','NET-001'),undefined);
});

test('validation rejects duplicated criteria and unrelated or malformed unit IDs',()=>{
  const base=overlay.concepts[0].outcomes[0];
  const item=(criteria:typeof base.assessment.criteria)=>
    customize('http-request-lifecycle','G1',o=>({...o,assessment:{...o.assessment,criteria}}));
  assert.throws(()=>buildLearningGraph(item([
    base.assessment.criteria[0],base.assessment.criteria[0],
  ]),curriculum),/Duplicate assessment criterion/);
  assert.throws(()=>buildLearningGraph(item([{
    ...base.assessment.criteria[0],itemId:'NET-006',
  }]),curriculum),/Assessment item is not in outcome/);
  assert.throws(()=>buildLearningGraph(item([{
    ...base.assessment.criteria[0],itemId:'NET-999',
  }]),curriculum),/Assessment item is not in outcome/);
  assert.throws(()=>buildLearningGraph(item([]),curriculum));
  assert.throws(()=>buildLearningGraph(item([{
    ...base.assessment.criteria[0],passWhen:'',
  }]),curriculum));
});

test('editorial proof boundary: critical rubrics demand the actual environment, not local fixture output',()=>{
  const entries=graph.concepts.flatMap(c=>c.outcomes.flatMap(o=>
    o.assessment.criteria.map(criterion=>[criterion.id,criterion] as const)));
  const byId=new Map(entries);
  for(const id of ['binding-failure','remote-reachability','namespace-reachability']){
    assert.equal(byId.get(id)?.evidenceKind,'network-lab');
    assert.match(byId.get(id)!.passWhen,/namespace|netns/i);
  }
  for(const id of ['readiness-dependency','dependency-outage','restart-isolation']){
    assert.equal(byId.get(id)?.evidenceKind,'cluster-test');
    assert.match(byId.get(id)!.passWhen,/Kubernetes|cluster/i);
  }
  assert.equal(byId.get('http-contract')?.evidenceKind,'framework-test');
  assert.match(byId.get('http-contract')!.passWhen,/MockMvc/);
  assert.ok(graph.relations.every(relation=>relation.type==='related'&&relation.status==='proposed'));
});

test('missing or invalid proof method is rejected rather than silently treated as demonstrated',()=>{
  const first=overlay.concepts[0].outcomes[0].assessment.criteria[0];
  const item=(entry:any)=>customize('http-request-lifecycle','G1',o=>({
    ...o,assessment:{...o.assessment,criteria:[entry,...o.assessment.criteria.slice(1)]},
  }));
  const {evidenceKind:_omitted,...withoutKind}=first;
  assert.throws(()=>buildLearningGraph(item(withoutKind),curriculum));
  assert.throws(()=>buildLearningGraph(item({...first,evidenceKind:'fixture-means-mastered'}),curriculum));
});

test('Java and PostgreSQL rubric requirements demand real CLI and DB experiments',()=>{
  const byId=new Map(graph.concepts.flatMap(c=>c.outcomes.flatMap(o=>
    o.assessment.criteria.map(k=>[k.id,k] as const))));
  assert.equal(byId.get('jdk-21-cli-build')?.evidenceKind,'cli-build');
  assert.match(byId.get('jdk-21-cli-build')!.passWhen,/Maven clean verify/);
  for(const id of ['sql-replayable-init','sql-ownership-model']){
    assert.equal(byId.get(id)?.evidenceKind,'database-test');
    assert.match(byId.get(id)!.passWhen,/PostgreSQL/);
  }
  assert.ok(graph.relations.every(r=>r.type==='related'&&r.status==='proposed'));
});
