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

test('staged navigation never replaces server evidence persistence', () => {
  const page = src('src/components/pages/LessonPage.tsx');
  const form = src('src/components/learning/EvidenceForm.tsx');
  assert.match(page, /const staged = !demo/);
  assert.match(page, /role="tab"/);
  assert.match(page, /aria-selected=\{stage === id\}/);
  assert.match(page, /onKeyDown=\{\(event\) => onTabKeyDown/);
  assert.match(page, /initialCompletionOpen=\{staged\}/);
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
  assert.match(page, /available \? children : staged \? <>/);
  assert.match(page, /Konten MDX lengkap untuk \{itemId\} belum tersedia/);
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
