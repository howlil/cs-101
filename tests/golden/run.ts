/**
 * M4 Golden Lesson acceptance harness.
 * Clones source files into an isolated temporary workspace; never mutates the
 * repository's production curriculum source; the pilot fixture is disposable.
 */
import { strict as assert } from 'node:assert';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  goldenManifest, goldenUnit, goldenSources, goldenSpec,
  goldenExecutablePlan, GOLDEN_UNIT_ID,
} from './content';
import { curriculumItemFingerprint, parseManifestV2 } from '../../src/domain/curriculum-v2/schema';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const scratch = mkdtempSync(join(tmpdir(), 'cs101-m4-golden-'));
const work = join(scratch, 'repo');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const report = (step: string) => console.log('[M4 Golden] ' + step);

function write(path: string, content: string) {
  const target = join(work, path);
  mkdirSync(dirname(target), {recursive: true});
  writeFileSync(target, content);
}
function writeJson(path: string, value: unknown) {
  write(path, JSON.stringify(value, null, 2) + '\n');
}
function run(script: string, ...args: string[]) {
  const result = spawnSync(pnpm, ['run', script, ...args], {
    cwd: work, env: process.env, encoding: 'utf8',
    timeout: 180000, maxBuffer: 5 * 1024 * 1024,
    shell: false,
  });
  const log = (result.stdout || '') + '\n' + (result.stderr || '');
  if (result.error || result.status !== 0) {
    throw new Error(script + ' failed: ' + (result.error?.message || result.status) + '\n' + log.slice(-10000));
  }
  report(script + ' OK');
  return log;
}
async function assertRenderedHtml() {
  const port = 4387;
  let server: ChildProcess | undefined;
  let output = '';
  try {
    server = spawn(process.execPath, ['scripts/start.mjs'], {
      cwd: work, shell: false,
      env: {...process.env, PORT: String(port), HOST: '127.0.0.1'},
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    server.stdout?.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    server.stderr?.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    let page = '';
    for (let attempt = 0; attempt < 90; attempt++) {
      if (server.exitCode !== null) throw new Error('Site server stopped: ' + output);
      try {
        const response = await fetch('http://127.0.0.1:' + port + '/?item=' + GOLDEN_UNIT_ID);
        if (response.ok) { page = await response.text(); break; }
      } catch { /* server has not started yet */ }
      await new Promise((r) => setTimeout(r, 200));
    }
    assert.ok(page.length > 0, 'Golden lesson route did not render. Server output:\n' + output);
    assert.ok(page.includes('Mental model: identitas vs nilai'), 'Materi tab missing worked explanation.');
    assert.ok(!page.includes('Cek jawaban'), 'Quiz must not render in Materi tab.');
    assert.ok(!page.includes('Kriteria selesai'), 'Project must not render in Materi tab.');
    assert.ok(page.includes('Sumber teknis'), 'Full technical source list must render in Materi tab.');
    assert.ok(page.includes('docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html'), 'Official reference must be accessible from Materi.');
    assert.ok(page.includes('Explore this concept across domains'), 'Published lesson must link back to its curated concept.');

    const graphResponse = await fetch('http://127.0.0.1:' + port + '/?mode=graph&concept=golden-fixture');
    assert.equal(graphResponse.status, 200);
    const graphPage = await graphResponse.text();
    assert.ok(graphPage.includes('Golden lesson concept'), 'Concept graph must render the selected concept.');
    assert.ok(graphPage.includes('JAV-009'), 'Graph must link to its canonical unit.');
    assert.ok(graphPage.includes('Competency target'), 'Level outcome must render.');
    assert.ok(graphPage.includes('Suggested study path'), 'Graph must render a deterministic suggested route.');
    assert.ok(graphPage.includes('Assessment blueprint'), 'Graph must expose proposed competency rubric.');
    assert.ok(graphPage.includes('Golden rubric criterion'), 'Graph must show fixture rubric requirement.');
    assert.ok(graphPage.includes('Required evidence: Framework integration test'), 'Graph must show the evidence method.');
    assert.ok(graphPage.includes('concept=golden-fixture'), 'Graph units must retain route context.');

    const linked = await fetch('http://127.0.0.1:' + port +
      '/?item=' + GOLDEN_UNIT_ID + '&concept=golden-fixture&level=G1');
    assert.equal(linked.status, 200);
    const linkedHtml = await linked.text();
    assert.ok(linkedHtml.includes('Step 1 of 1'), 'Linked unit must show route position.');
    assert.ok(linkedHtml.includes('Back to concept graph'), 'Linked unit must offer a route back.');
    assert.ok(linkedHtml.includes('view=soal') && linkedHtml.includes('concept=golden-fixture'),
      'Lesson views must keep the selected learning-path context.');
    assert.ok(!linkedHtml.includes('Assessment guide'), 'Rubric must not appear in the Materi view.');
    const linkedProject = await fetch('http://127.0.0.1:' + port +
      '/?item=' + GOLDEN_UNIT_ID + '&view=project&concept=golden-fixture&level=G1');
    assert.equal(linkedProject.status, 200);
    const linkedProjectHtml=await linkedProject.text();
    assert.ok(linkedProjectHtml.includes('Golden rubric criterion'),
      'Selected Project view should expose criteria for its canonical unit only.');
    assert.ok(linkedProjectHtml.includes('Required evidence: Framework integration test'),
      'Project rubric must expose the actual evidence method.');
    const emptyDepth = await fetch('http://127.0.0.1:' + port + '/?mode=graph&level=G4');
    assert.equal(emptyDepth.status, 200);
    assert.ok((await emptyDepth.text()).includes('No curated G4 outcomes yet'), 'Missing depth must show real coverage gap.');

    const root = 'http://127.0.0.1:' + port + '/?item=' + GOLDEN_UNIT_ID;
    const quizResponse = await fetch(root + '&view=soal');
    assert.equal(quizResponse.status, 200);
    const quizPage = await quizResponse.text();
    assert.ok(quizPage.includes('Cek jawaban'), 'Quiz must render in Soal tab.');
    assert.ok(quizPage.includes('Coba prediksi dahulu'), 'Guided practice must render in Soal tab.');
    assert.ok(!quizPage.includes('Mental model: identitas vs nilai'), 'Materi must not render in Soal tab.');
    assert.ok(!quizPage.includes('Kriteria selesai'), 'Project must not render in Soal tab.');
    assert.ok(!quizPage.includes('Sumber teknis'), 'SourceList must not be gated behind the Soal tab.');

    const projectResponse = await fetch(root + '&view=project');
    assert.equal(projectResponse.status, 200);
    const projectPage = await projectResponse.text();
    assert.ok(projectPage.includes('Kriteria selesai'), 'Project checklist must render in Project tab.');
    assert.ok(projectPage.includes('Payment Replay Safety Lab'), 'Project bridge must render in Project tab.');
    assert.ok(!projectPage.includes('Cek jawaban'), 'Quiz must not render in Project tab.');
    assert.ok(!projectPage.includes('Mental model: identitas vs nilai'), 'Materi must not render in Project tab.');
    assert.ok(!projectPage.includes('Sumber teknis'), 'SourceList must not be gated behind Project.');

    const invalid = await fetch(root + '&view=invalid');
    assert.equal(invalid.status, 200);
    assert.ok((await invalid.text()).includes('Mental model: identitas vs nilai'));
    report('Focused HTTP content: Materi, Soal and Project are independently rendered');
  } finally {
    server?.kill('SIGTERM');
  }
}

let failure: unknown;
try {
  // The real workbook has 370 source-grounded outlines; the golden fixture
  // temporarily replaces those ONLY inside the copied test workspace.
  parseManifestV2(JSON.parse(readFileSync(join(repository,'curriculum/manifest.v2.json'),'utf8')));

  // Copy a clean source tree, excluding non-source dependencies/build output.
  const skip = new Set(['node_modules','.git','.astro','dist','.wrangler','.data','coverage']);
  cpSync(repository, work, {
    recursive: true,
    filter: (path) => path === repository || !skip.has(basename(path)),
  });
  if (!existsSync(join(repository, 'node_modules'))) throw new Error('Install pnpm dependencies before running the golden harness.');
  // Vite needs a local node_modules tree; symlinking it from another root
  // breaks module/CSS metadata resolution. Hardlinks can fail across mounts
  // (e.g. a temp filesystem), so a portable copy is used for this fixture.
  const dependencies = join(repository, 'node_modules');
  const localDependencies = join(work, 'node_modules');
  if (process.platform === 'win32') {
    cpSync(dependencies, localDependencies, {recursive: true, dereference: false});
  } else {
    const clone = spawnSync('cp', ['-a', '--reflink=auto', dependencies, localDependencies], {
      encoding:'utf8', timeout:120000, maxBuffer:5 * 1024 * 1024,
    });
    if (clone.error || clone.status !== 0) {
      throw new Error('Isolated node_modules copy failed: ' + (clone.error?.message ?? clone.stderr));
    }
  }

  assert.equal(goldenUnit.fingerprint, curriculumItemFingerprint(goldenUnit));
  parseManifestV2(goldenManifest);
  writeJson('curriculum/manifest.v2.json', goldenManifest);
  // Golden must isolate all real published lessons and their V3 records before
  // replacing the manifest with one fixture. Otherwise a newly published real
  // unit would fail validation against the isolated JAV-009-only curriculum.
  for (const directory of [
    'src/content/lessons', 'generation/pedagogy', 'generation/sources',
    'generation/verified', 'generation/proofs', 'generation/executables',
    'generation/fixtures', 'review-banks',
  ]) {
    rmSync(join(work, directory), {recursive:true,force:true});
    mkdirSync(join(work, directory), {recursive:true});
  }
  rmSync(join(work, 'generation/NET-001.json'), {force:true});
  // This isolated manifest deliberately contains only JAV-009. Its concept
  // overlay must be equally isolated; never weaken production link validation.
  writeJson('curriculum/learning-graph.v2.json', {
    version:2,
    concepts:[{
      id:'golden-fixture',
      title:'Golden lesson concept',
      description:'Fixture-local concept for validating a published lesson.',
      outcomes:[{level:'G1',competency:'Explain the authored golden lesson.',
        evidence:'Complete a local self-check.',itemIds:[GOLDEN_UNIT_ID],status:'proposed',
        assessment:{
          task:'Explain the authored Java golden lesson with a concrete example.',
          criteria:[{id:'golden-rubric',itemId:GOLDEN_UNIT_ID,evidenceKind:'framework-test',
            check:'Golden rubric criterion: demonstrate reference identity.',
            passWhen:'The example distinguishes identity and value comparisons.'}],
        }}],
    }],
    applications:[{conceptId:'golden-fixture',itemId:GOLDEN_UNIT_ID,role:'application'}],
    relations:[],
    competencyDependencies:[],
  });
  report('isolated curriculum fixture: 1 unit + 1 linked project; production manifest untouched');

  run('generation:prepare', GOLDEN_UNIT_ID);
  const staging = 'generation/staging/' + GOLDEN_UNIT_ID + '/';
  const expectedCtx = JSON.parse(readFileSync(join(work,staging,'context.json'),'utf8'));
  assert.equal(expectedCtx.target.id, GOLDEN_UNIT_ID);
  assert.equal(expectedCtx.nearestCheckpoint?.id, 'JAV-P01');

  const mdx = readFileSync(join(repository,'tests/golden/JAV-009.mdx'),'utf8')
    .replaceAll('__GOLDEN_FINGERPRINT__', goldenUnit.fingerprint);
  write(staging + 'lesson.mdx', mdx);
  writeJson(staging + 'lesson-spec.json', goldenSpec);
  writeJson(staging + 'source-pack.json', goldenSources);
  writeJson(staging + 'executable-examples.json', goldenExecutablePlan);
  write(staging + 'fixtures/DuplicatePaymentChecker.java',
    readFileSync(join(repository,'tests/golden/DuplicatePaymentChecker.java'),'utf8'));

  run('generation:validate', GOLDEN_UNIT_ID);
  run('generation:promote', GOLDEN_UNIT_ID);
  run('validate');
  run('check');
  run('build:node');
  await assertRenderedHtml();
  report('PASS: prepare → author → validate → promote → validate → typecheck → build → HTTP render');
} catch (error) {
  failure = error;
  console.error('[M4 Golden] FAIL', error);
} finally {
  try { rmSync(scratch, {recursive:true,force:true,maxRetries:4,retryDelay:150}); }
  catch (error) {console.error('[M4 Golden] Cleanup warning',error);}
}
if (failure) process.exitCode = 1;
