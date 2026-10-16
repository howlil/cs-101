import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const src = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('SQL-001 uses authored stage boundaries with original quiz and challenge', () => {
  const lesson = src('src/content/lessons/SQL-001.mdx');
  assert.equal((lesson.match(/<LessonStage stage="understand">/g) ?? []).length, 1); // concepts + sources share one tabpanel
  assert.equal((lesson.match(/<LessonStage stage="practice">/g) ?? []).length, 1);
  assert.equal((lesson.match(/<LessonStage stage="evidence">/g) ?? []).length, 1);
  assert.equal((lesson.match(/<\/LessonStage>/g) ?? []).length, 3);
  assert.match(lesson, /<Quiz items=/);
  assert.match(lesson, /<Challenge\s/);
  assert.match(lesson, /<ExitCriteria items=/);
  assert.match(lesson, /<SourceList sources=/);
});

test('SQL-001 lesson and generated review bank cover all curriculum gates', () => {
  const lesson = src('src/content/lessons/SQL-001.mdx');
  const staged = src('generation/staging/SQL-001/lesson.mdx');
  const spec = JSON.parse(src('generation/staging/SQL-001/lesson-spec.json'));
  const bank = JSON.parse(src('review-banks/SQL-001.json'));
  assert.equal(lesson, staged, 'Promoted lesson must match staged source');
  assert.deepEqual(bank.questions, spec.reviewQuestions, 'Review bank must match lesson spec');
  assert.equal((lesson.match(/^-- (?:0[1-9]|1[0-9]|20)(?:.*)$/gm) ?? []).length, 20);
  assert.match(lesson, /RAISE EXCEPTION/);
  assert.match(lesson, /no ORM|tanpa ORM/i);
  assert.equal(new Set(spec.coverage.map((entry: { criterionId: string }) => entry.criterionId)).size, 4);
  assert.equal(spec.reviewQuestions.length, 5);
});

test('staged navigation never replaces server evidence persistence', () => {
  const page = src('src/components/pages/LessonPage.tsx');
  const form = src('src/components/learning/EvidenceForm.tsx');
  assert.doesNotMatch(page, /const staged = !demo/);
  assert.match(page, /className="lesson-grid lesson-staged"/);
  assert.match(page, /role="tab"/);
  assert.match(page, /aria-selected=\{stage === id\}/);
  assert.match(page, /onKeyDown=\{\(event\) => onTabKeyDown/);
  // Session logging remains server-backed but completion details now open only on demand.
  assert.doesNotMatch(page, /<SessionLogger\s+initialCompletionOpen/);
  assert.match(page, /<SessionLogger/);
  assert.match(form, /postJson<MutationResult>\('\/api\/sessions'/);
  assert.match(form, /const missing = criteria\.filter/);
  assert.match(form, /setCompletionOpen\(initialCompletionOpen \|\| draft\.evidence\.length > 0\)/);
});

test('all authored lessons own three stage boundaries and original assessments', () => {
  for (const id of ['SQL-001', 'SQL-002', 'JAV-001']) {
    const lesson = src('src/content/lessons/' + id + '.mdx');
    for (const stage of ['understand', 'practice', 'evidence']) {
      assert.equal((lesson.match(new RegExp('<LessonStage stage="' + stage + '">', 'g')) ?? []).length, 1, id + '/' + stage);
    }
    assert.equal((lesson.match(/<\/LessonStage>/g) ?? []).length, 3);
    for (const authored of [/<Quiz items=/, /<Challenge\s/, /<ExitCriteria items=/, /<SourceList sources=/]) {
      assert.match(lesson, authored, id);
    }
  }
});

test('units without MDX render honest scope/challenge/evidence fallback', () => {
  const page = src('src/components/pages/LessonPage.tsx');
  assert.match(page, /available \? children : <>/);
  assert.match(page, /Kerangka kurikulum — materi belum ditulis/);
  assert.match(page, /challenge\.steps\.map/);
  assert.match(page, /criteria\.map/);
  assert.match(page, /<SessionLogger/);
  assert.match(page, /document\.documentElement\.dataset\.focus/);
});

test('legacy permanent lesson rail styles are removed', () => {
  const css = src('src/styles/workspace.css');
  assert.doesNotMatch(css, /\.lesson-sidecar/);
  assert.match(css, /\.lesson-staged blockquote/);
});


test('lesson uses the shared server-owned state projection and navigates linearly', () => {
  const lesson = src('src/components/pages/LessonPage.tsx');
  const route = src('src/pages/learn/[id].astro');
  assert.match(route, /getItemLearningView/);
  assert.match(route, /getItemActionState/);
  assert.match(route, /getTrackExplorer/);
  assert.match(route, /missingPrerequisites/);
  assert.match(lesson, /<ItemStatusAction/);
  assert.doesNotMatch(lesson, /!active && <div className="actions"/);
  assert.match(lesson, /className="lesson-location"/);
  assert.match(lesson, /className="lesson-sequence"/);
  assert.match(lesson, /rel="next"/);
  assert.match(lesson, /rel="prev"/);
});

test('session submission re-fetches the authoritative SSR view', () => {
  const evidence = src('src/components/learning/EvidenceForm.tsx');
  assert.match(evidence, /navigate\(window\.location\.href, \{ history: 'replace' \}\)/);
  assert.match(evidence, /removeDraft\(itemId\)/);
  assert.match(evidence, /postJson<MutationResult>\('\/api\/sessions'/);
});
