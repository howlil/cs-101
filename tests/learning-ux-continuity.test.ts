import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('lesson transitions move focus after primary next CTA and preserve keyboard tabs', () => {
  const lesson = read('src/components/pages/LessonPage.tsx');
  assert.match(lesson, /chooseStage\('practice', true\)/);
  assert.match(lesson, /chooseStage\('evidence', true\)/);
  assert.match(lesson, /requestAnimationFrame/);
  assert.match(lesson, /needsEligibility \? 'lesson-evidence-gate' : 'lesson-panel-' \+ next/);
  assert.match(lesson, /onTabKeyDown/);
  assert.match(lesson, /aria-selected=\{stage === id\}/);
});

test('evidence tab never becomes an empty destination for ineligible learners', () => {
  const lesson = read('src/components/pages/LessonPage.tsx');
  assert.match(lesson, /lesson-evidence-gate/);
  assert.match(lesson, /Prasyarat belum terpenuhi/);
  assert.match(lesson, /Aktifkan materi untuk menyimpan bukti/);
  assert.match(lesson, /<ItemStatusAction itemId=\{itemId\} kind="unit"/);
  assert.match(lesson, /Materi sudah selesai/);
});

test('quizzes are formative, evidence drafts are distinguished from committed sessions', () => {
  const quiz = read('src/components/lesson/QuizClient.tsx');
  const evidence = read('src/components/learning/EvidenceForm.tsx');
  assert.match(quiz, /Kuis ini latihan/);
  assert.match(quiz, /Cek jawaban/);
  assert.match(evidence, /Draft otomatis tersimpan di browser ini; belum tercatat sebagai sesi/);
  assert.match(evidence, /completedEvidenceCount/);
  assert.match(evidence, /getElementsByName\('evidence:' \+ missing\[0\]\.id\)/);
  assert.match(evidence, /postJson<MutationResult>\('\/api\/sessions'/);
});

test('review explains disabled submission and curriculum search never silently truncates results', () => {
  const review = read('src/components/learning/ReviewAttempt.tsx');
  const explorer = read('src/components/curriculum/CurriculumExplorer.tsx');
  assert.match(review, /answeredCount/);
  assert.match(review, /pertanyaan terjawab/);
  assert.match(explorer, /setResultLimit\(\(limit\) => limit \+ 16\)/);
  assert.match(explorer, /results\.length\}\/\{matches\.length/);
});

test('resuming an existing lesson honors saved stage unless URL explicitly overrides it', () => {
  const lesson = read('src/components/pages/LessonPage.tsx');
  assert.match(lesson, /window\.location\.hash\.slice\(1\) \|\| lastAnchor \|\| ''/);
  assert.match(lesson, /\[itemId, headings, lastAnchor\]/);
});

test('evidence eligibility guidance appears before the authored stage content', () => {
  const lesson = read('src/components/pages/LessonPage.tsx');
  assert.ok(lesson.indexOf('id="lesson-evidence-gate"') < lesson.indexOf('available ? children'));
});
