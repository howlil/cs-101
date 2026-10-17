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
    for (const expected of [
      'Equality, hashCode', 'same-object=false', 'equal-value=true',
      'Duplicate Payment Checker', 'Cek jawaban', 'HashSet',
      'Payment Replay Safety Lab',
    ]) {
      assert.ok(page.includes(expected), 'Rendered HTML missing: ' + expected);
    }
    const empty = await fetch('http://127.0.0.1:' + port + '/?item=SQL-001');
    assert.equal(empty.status, 200);
    report('HTTP /?item=JAV-009 rendered MDX, scaffold, quiz and project link');
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
  // Astro Vite expects dependency source and virtual modules beneath the same
  // project root. An external node_modules symlink breaks its CSS metadata cache.
  // Linux/macOS: clone the package tree using hardlinks, not copies of each byte.
  // Windows: fall back to normal copy for CI-independent developer runs.
  const dependencies = join(repository, 'node_modules');
  const localDependencies = join(work, 'node_modules');
  if (process.platform === 'win32') {
    cpSync(dependencies, localDependencies, {recursive: true, dereference: false});
  } else {
    const clone = spawnSync('cp', ['-al', dependencies, localDependencies], {
      encoding:'utf8', timeout:60000,
    });
    if (clone.error || clone.status !== 0) {
      throw new Error('Isolated node_modules clone failed: ' + (clone.error?.message ?? clone.stderr));
    }
  }

  assert.equal(goldenUnit.fingerprint, curriculumItemFingerprint(goldenUnit));
  parseManifestV2(goldenManifest);
  writeJson('curriculum/manifest.v2.json', goldenManifest);
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
