import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { sourcePackSchema } from '../src/domain/generation/schema';
import { executablePlanSchema } from '../src/domain/generation/executable-schema';
import { verifySourceClaims, assertV3LessonBindings, checkPublishedV3Files, sha256 } from '../src/domain/generation/verification';
import { executeExamples } from '../scripts/lib/executable-proof';

const fp = 'sha256:' + 'a'.repeat(64);
const lesson = (id='JAV-001') => [
  "import pedagogyRecord from '../../../generation/pedagogy/" + id + ".json';",
  "import questionBank from '../../../review-banks/" + id + ".json';",
  "export const lessonSegments = pedagogyRecord.pedagogy.segments;",
  '<LearningSegments stage="understand" segments={lessonSegments} />',
  '<LearningSegments stage="practice" segments={lessonSegments} />',
  '<Quiz bank={questionBank} />',
  '<LearningSegments stage="evidence" segments={lessonSegments} />',
].join('\n');

const ledger = () => sourcePackSchema.parse({
  itemId:'JAV-001',curriculumFingerprint:fp,
  sources:[{title:'Java docs',url:'https://dev.java/learn/',tier:0,supports:['equality']}],
  unsupportedClaims:[],
  claims:[{
    id:'equality-contract',
    statement:'Equal values must produce the same hash code',
    conceptIds:['equality'],
    sourceUrl:'https://dev.java/learn/',
    locator:'Objects, equals/hashCode section',
    rationale:'Defines the contract that is exercised by this lesson',
  }],
});

test('V3 claims must cover concepts with a traceable source and locator',()=>{
  const pack=ledger();
  assert.equal(verifySourceClaims(pack,[{id:'equality'}],true).length,1);
  assert.throws(()=>verifySourceClaims({...pack,claims:[]},[{id:'equality'}],true),/claim ledger/);
  assert.throws(()=>verifySourceClaims(pack,[{id:'another-concept'}],true),/concept tidak dikenal/);
  assert.throws(()=>verifySourceClaims({...pack,claims:[{...pack.claims[0],sourceUrl:'https://fake.invalid'}]},[{id:'equality'}],true),/di luar source pack/);
  assert.throws(()=>verifySourceClaims({...pack,claims:[pack.claims[0],pack.claims[0]]},[{id:'equality'}],true),/duplikat/);
});

test('V3 MDX can only consume canonical published pedagogy and question bank',()=>{
  assert.doesNotThrow(()=>assertV3LessonBindings(lesson(),'JAV-001'));
  assert.throws(()=>assertV3LessonBindings(lesson().replace('<Quiz bank={questionBank} />','<Quiz items={[]} />'),'JAV-001'),/question bank import|bank quiz/);
  assert.throws(()=>assertV3LessonBindings(lesson().replace('generation/pedagogy/JAV-001','generation/pedagogy/JAV-002'),'JAV-001'),/pedagogy import/);
  assert.throws(()=>assertV3LessonBindings(lesson().replace('export const lessonSegments = pedagogyRecord.pedagogy.segments;','export const lessonSegments = [];'),'JAV-001'),/shared segments/);
  assert.throws(()=>assertV3LessonBindings(lesson().replace('<LearningSegments stage="evidence" segments={lessonSegments} />',''),'JAV-001'),/stage: evidence/);
});

test('executables require strict local paths, known runtimes and either proof or justified exception',()=>{
  const valid={version:1,itemId:'JAV-001',curriculumFingerprint:fp,
    examples:[{id:'hello',runtime:'node',file:'hello.mjs',expectedStdout:'hello\n'}]};
  assert.doesNotThrow(()=>executablePlanSchema.parse(valid));
  assert.throws(()=>executablePlanSchema.parse({...valid,examples:[{...valid.examples[0],file:'../unsafe.mjs'}]}));
  assert.throws(()=>executablePlanSchema.parse({...valid,examples:[]}));
  assert.doesNotThrow(()=>executablePlanSchema.parse({...valid,examples:[],noExecutableReason:'A conceptual topic without executable examples.'}));
});

test('Node fixture is executed with exact stdout and no shell interpolation',()=>{
  const folder=mkdtempSync(join(tmpdir(),'cs101-example-'));
  try {
    writeFileSync(join(folder,'hello.mjs'),"console.log('hello')\n");
    const plan={version:1,itemId:'JAV-001',curriculumFingerprint:fp,
      examples:[{id:'hello',runtime:'node',file:'hello.mjs',expectedStdout:'hello\n'}]};
    const proof=executeExamples(plan,folder);
    assert.equal(proof.status,'verified');
    assert.equal(proof.examples[0].verified,true);
    assert.equal(proof.examples[0].fixtureSha256,sha256(readFileSync(join(folder,'hello.mjs'))));
    assert.throws(()=>executeExamples({...plan,examples:[{...plan.examples[0],expectedStdout:'wrong\n'}]},folder),/output mismatch/);
    writeFileSync(join(folder,'hello.mjs'),"process.exit(2)\n");
    assert.throws(()=>executeExamples(plan,folder),/Executable example failed/);
    const manual=executeExamples({version:1,itemId:'JAV-001',curriculumFingerprint:fp,examples:[],
      noExecutableReason:'No runnable code is suitable for this topic.'},folder);
    assert.equal(manual.status,'not-executable');
  } finally {rmSync(folder,{force:true,recursive:true});}
});

test('published receipt rejects changes to imported lesson, quiz or pedagogy data',()=>{
  const root=mkdtempSync(join(tmpdir(),'cs101-published-'));
  const id='JAV-001';
  const contents={
    lesson:lesson(id),
    pedagogy:JSON.stringify({unitId:id,curriculumFingerprint:fp,pedagogy:{version:3,segments:[]}})+'\n',
    questionBank:JSON.stringify({itemId:id,curriculumFingerprint:fp,questions:[]})+'\n',
    sourcePack:JSON.stringify(ledger())+'\n',
    exampleProof:JSON.stringify({itemId:id,status:'not-executable',examples:[]})+'\n',
    examplePlan:JSON.stringify({version:1,itemId:id,curriculumFingerprint:fp,examples:[],noExecutableReason:'No executable mechanism here.'})+'\n',
  };
  const paths={
    lesson:'src/content/lessons/'+id+'.mdx',
    pedagogy:'generation/pedagogy/'+id+'.json',
    questionBank:'review-banks/'+id+'.json',
    sourcePack:'generation/sources/'+id+'.json',
    exampleProof:'generation/proofs/'+id+'.json',
    examplePlan:'generation/executables/'+id+'.json',
  };
  const write=(path:string,content:string)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),content);};
  try {
    for(const [kind,path] of Object.entries(paths)) write(path,contents[kind as keyof typeof contents]);
    const receipt={version:3,itemId:id,curriculumFingerprint:fp,
      hashes:Object.fromEntries(Object.entries(contents).map(([k,v])=>[k,sha256(v)]))};
    write('generation/verified/'+id+'.json',JSON.stringify(receipt)+'\n');
    assert.doesNotThrow(()=>checkPublishedV3Files(root,id,fp));
    write(paths.questionBank,contents.questionBank.replace('questions','questionsTampered'));
    assert.throws(()=>checkPublishedV3Files(root,id,fp),/Published artifact drift/);
  } finally {rmSync(root,{force:true,recursive:true});}
});
