import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { curriculumItemFingerprint } from '../src/domain/curriculum-v2/schema';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { validatePedagogySpec } from '../src/domain/generation/pedagogy';
import { contentCriteriaForItem } from '../src/domain/generation/criteria';

const fp=<T extends object>(x:T)=>({...x,fingerprint:curriculumItemFingerprint(x)});
const unit=fp({id:'JAV-001',kind:'unit' as const,trackId:'java',moduleId:'core',order:1,title:'Fixture unit',
  prerequisites:[],scope:['Equality'],criteria:[{id:'c1',text:'Explain'},{id:'c2',text:'Test'}],
  challenge:{title:'Test',steps:['Run'],raw:'Test the code'},
  marketExpectation:[],crossModuleReferenceRaw:[],source:{title:'Docs',url:'https://dev.java/learn/'}});
const project=fp({id:'JAV-P01',kind:'checkpoint' as const,trackId:'java',moduleId:'core',order:2,
  title:'Project',problemStatement:'Test equality',requirements:[{id:'r1',text:'Works'}],
  prerequisites:[],source:{title:'Docs',url:'https://dev.java/learn/'}});
const graph=buildCurriculumGraph({version:2,
  tracks:[{id:'java',title:'Java',order:1}],modules:[{id:'core',trackId:'java',title:'Core',order:1}],
  items:[unit,project],relations:[{from:'JAV-001',to:'JAV-P01',type:'contributes_to'}]});
const makeSegment=(id:string,criterionIds:string[])=>({
  id,objective:'Understand equality',whyItMatters:'Reliable lookup',
  mentalModel:'Value before identity',explanation:'Model predicts behavior',
  prerequisiteConceptIds:[],
  workedExample:{problem:'Compare objects',steps:[{action:'Construct',reason:'Observe',expectedResult:'Two values'}]},
  guidedPractice:{prompt:'Why do values match?',hints:['Think values','Not identity'],explanation:'They share values'},
  independentChallenge:{prompt:'Implement a new value object and test its behavior.',criterionIds,expectedEvidence:['Verified output']},
});
const fixture={unitId:unit.id,curriculumFingerprint:unit.fingerprint,pedagogy:{
  version:2 as const,
  segments:[makeSegment('first',['c1']),makeSegment('second',['c2']),makeSegment('third',['c1']),
    makeSegment('fourth',['c2']),makeSegment('deterministic-cli',['challenge'])],
  projectBridge:{checkpointId:'JAV-P01',requirementIds:['r1'],contribution:'Bridge to project',verification:['Test project']},
}};
const copy=()=>structuredClone(fixture.pedagogy);

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
