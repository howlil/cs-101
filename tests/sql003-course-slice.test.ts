import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import manifestSource from '../curriculum/manifest.v2.json';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { validateGenerationPlan, buildGenerationRecord, buildReviewBank } from '../src/domain/generation/validate';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const json = (path: string): unknown => JSON.parse(read(path));

test('SQL-003 authored lesson and review bank derive from one validated generation plan', () => {
  const graph = buildCurriculumGraph(manifestSource);
  const { sourcePack, lessonSpec } = validateGenerationPlan(graph, 'SQL-003',
    json('generation/staging/SQL-003/source-pack.json'),
    json('generation/staging/SQL-003/lesson-spec.json'));
  assert.deepEqual(buildGenerationRecord(sourcePack, lessonSpec), json('generation/SQL-003.json'));
  assert.deepEqual(buildReviewBank(lessonSpec), json('review-banks/SQL-003.json'));
  const lesson = read('src/content/lessons/SQL-003.mdx');
  assert.equal(lesson, read('generation/staging/SQL-003/lesson.mdx'));
  for (const stage of ['understand', 'practice', 'evidence']) {
    assert.equal((lesson.match(new RegExp('<LessonStage stage="' + stage + '">', 'g')) ?? []).length, 1);
  }
  assert.match(lesson, /ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW/);
  assert.match(lesson, /reconciled/);
  assert.match(lesson, /<Quiz items=/);
  assert.match(lesson, /<Challenge\s/);
  assert.match(lesson, /<ExitCriteria items=/);
  assert.match(lesson, /<SourceList sources=/);
});

test('review eligibility uses a bank matching the curriculum fingerprint', () => {
  const today = read('src/pages/index.astro');
  const progress = read('src/pages/progress.astro');
  for (const file of [today, progress]) {
    assert.match(file, /reviewBankFor/);
    assert.match(file, /bank\?\.curriculumFingerprint === item\.item\.fingerprint/);
  }
});
