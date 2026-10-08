import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const src = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('SQL-001 uses authored stage boundaries with original quiz and challenge', () => {
  const lesson = src('src/content/lessons/SQL-001.mdx');
  assert.equal((lesson.match(/<LessonStage stage="understand">/g) ?? []).length, 2); // concepts + sources
  assert.equal((lesson.match(/<LessonStage stage="practice">/g) ?? []).length, 1);
  assert.equal((lesson.match(/<LessonStage stage="evidence">/g) ?? []).length, 1);
  assert.equal((lesson.match(/<\\/LessonStage>/g) ?? []).length, 4);
  assert.match(lesson, /<Quiz items=/);
  assert.match(lesson, /<Challenge\\s/);
  assert.match(lesson, /<ExitCriteria items=/);
  assert.match(lesson, /<SourceList sources=/);
});

test('staged navigation never replaces server evidence persistence', () => {
  const page = src('src/components/pages/LessonPage.tsx');
  const form = src('src/components/learning/EvidenceForm.tsx');
  assert.match(page, /itemId === 'SQL-001' && available && !demo/);
  assert.match(page, /role="tab"/);
  assert.match(page, /aria-selected=\\{stage === id\\}/);
  assert.match(page, /onKeyDown=\\{\\(event\\) => tabKeyboard/);
  assert.match(page, /initialCompletionOpen=\\{staged\\}/);
  assert.match(form, /postJson<MutationResult>\\('\\/api\\/sessions'/);
  assert.match(form, /const missing = criteria\\.filter/);
  assert.match(form, /setCompletionOpen\\(initialCompletionOpen \\|\\| draft\\.evidence\\.length > 0\\)/);
});
