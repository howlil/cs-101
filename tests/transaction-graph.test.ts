import {test} from 'node:test';
import assert from 'node:assert/strict';
import manifest from '../curriculum/manifest.v2.json';
import overlay from '../curriculum/learning-graph.v2.json';
import {buildCurriculumGraph} from '../src/domain/curriculum-v2/graph';
import {buildLearningGraph,getFocusedConcept,assessmentForItem,getConceptNeighborhood} from '../src/domain/learning-graph';
import {planLearningGoal} from '../src/domain/learning-planner';
import {reportGraphCoverage} from '../src/domain/graph-coverage';

const curriculum=buildCurriculumGraph(manifest);
const graph=buildLearningGraph(overlay,curriculum);
const expected=['JAV-010','JAV-019','JAV-021','SQL-010','SPR-022',
  'JAV-022','SQL-011','SQL-017','SPR-018','SQL-018','SQL-019','SPR-017','SPR-021'];

test('transaction slice maps exactly 13 previously unmapped canonical P0 units; no authored lesson invented',()=>{
  const published=new Set(['JAV-001','NET-001','NET-006','OSX-029','PRD-002','SPR-006',
    'SQL-001','SYS-008','TST-007','TST-019','TST-020','TST-021','TST-022','TST-023','TST-024','TST-025']);
  const covered=reportGraphCoverage(graph,published);
  assert.equal(covered.totalItems,370);
  assert.equal(covered.mappedItemCount,32);
  assert.equal(covered.totalConcepts,18);
  assert.equal(covered.competencyOutcomes,20);
  assert.equal(covered.unmappedPublished.length,0);
  assert.equal(covered.reviewedDependencies,4);
  assert.equal(graph.applications.filter(a=>expected.includes(a.itemId)).length,13);
  for(const id of expected){
    const unit=curriculum.itemsById.get(id);
    assert.ok(unit&&unit.kind==='unit');
    assert.ok(unit.challenge.raw.startsWith('P0'));
    assert.ok(!published.has(id));
    assert.equal(graph.applications.filter(a=>a.itemId===id).length,1);
  }
});
test('G2 concurrency goal follows reviewed cross-level database and ledger prerequisites',()=>{
  const plan=planLearningGoal(graph,{conceptId:'concurrent-debit-safety',level:'G2'},new Set());
  assert.equal(plan.outcomeAvailable,true);
  assert.deepEqual(plan.steps.map(s=>s.itemId),[
    'SQL-001','SQL-006','JAV-022','SQL-011','SQL-017','SPR-018',
    'SQL-018','SQL-019','SPR-017','SPR-021'
  ]);
  assert.equal(plan.reviewedPrerequisiteCount,2);
  assert.deepEqual(plan.steps.map(s=>s.level),[
    'G1','G1','G1','G1','G1','G1','G2','G2','G2','G2']);
  assert.equal(plan.publishedCount,0); // availability is supplied, never claimed
  assert.equal(plan.outlineCount,10);
  assert.deepEqual(plan.gaps,[]);
  assert.deepEqual(plan.steps.slice(0,6).map(s=>s.reason),
    Array(6).fill('reviewed-prerequisite'));
});
test('rubric criteria require distinct real Java, PostgreSQL and Spring proof boundaries',()=>{
  for(const id of ['transfer-state-machine','idempotent-transfer-replay',
    'ledger-atomicity','concurrent-debit-safety']){
    const focus=getFocusedConcept(graph,id,id==='concurrent-debit-safety'?'G2':'G1');
    assert.equal(focus.outcome?.status,'proposed');
    assert.ok(focus.outcome?.assessment.criteria.length>=2);
    for(const criterion of focus.outcome!.assessment.criteria){
      assert.ok(focus.outcome!.itemIds.includes(criterion.itemId));
      const mapped: ReturnType<typeof curriculum.itemsById.get> = curriculum.itemsById.get(criterion.itemId);
      if (!mapped || mapped.kind !== 'unit') throw new Error('Expected mapped curriculum unit');
      const trackId: string = mapped.trackId;
      if(trackId==='database')assert.equal(criterion.evidenceKind,'database-test');
      if(trackId==='spring-boot')assert.equal(criterion.evidenceKind,'framework-test');
      if(trackId==='java')assert.equal(criterion.evidenceKind,'cli-build');
      assert.ok(assessmentForItem(graph,id,focus.level,criterion.itemId)?.criteria.some(c=>c.id===criterion.id));
    }
  }
  assert.equal(assessmentForItem(graph,'concurrent-debit-safety','G1','SQL-019'),undefined);
});
test('proposed semantic relations do not create implicit prerequisite paths',()=>{
  const plan=planLearningGoal(graph,{conceptId:'idempotent-transfer-replay',level:'G1'},new Set());
  assert.equal(plan.reviewedPrerequisiteCount,0);
  assert.deepEqual(plan.steps.map(s=>s.itemId),['JAV-021','SQL-010','SPR-022']);
  const related=graph.relations.filter(e=>e.to==='idempotent-transfer-replay');
  assert.ok(related.length>=2);
  assert.ok(related.every(e=>e.type==='related'&&e.status==='proposed'));
});
test('G2 explorer never projects G1-only neighbors, while G1 ledger has reviewed schema link',()=>{
  const concurrency=getFocusedConcept(graph,'concurrent-debit-safety','G2');
  const n=getConceptNeighborhood(graph,concurrency);
  assert.deepEqual(n.nodes.map(x=>x.id),['concurrent-debit-safety']);
  const ledger=getFocusedConcept(graph,'ledger-atomicity','G1');
  assert.ok(ledger.neighbors.some(x=>x.concept.id==='relational-schema'
    &&x.relation.type==='requires'&&x.relation.status==='reviewed'&&x.direction==='in'));
  assert.ok(!getFocusedConcept(graph,'concurrent-debit-safety','G1').outcome);
});
