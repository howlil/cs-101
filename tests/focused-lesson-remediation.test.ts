import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertFocusedLessonLayout } from '../src/domain/generation/focused-lesson-layout';

const focusedV3 = [
  '---', 'taskId: "JAV-001"', 'demo: false', '---',
  "import LessonStage from '../../components/lesson/LessonStage.astro';",
  '<LessonStage stage="understand">',
  '## Understand',
  '<MentalModel title="Identity">Identity vs equality</MentalModel>',
  '<ConceptGraph>Objects and values</ConceptGraph>',
  '<LearningSegments stage="understand" segments={lessonSegments} />',
  '<SourceList sources={[]} />',
  '</LessonStage>',
  '<LessonStage stage="practice">',
  '## Practice',
  '<LearningSegments stage="practice" segments={lessonSegments} />',
  '<Quiz items={[]} />',
  '</LessonStage>',
  '<LessonStage stage="evidence">',
  '## Project',
  '<LearningSegments stage="evidence" segments={lessonSegments} />',
  '<Challenge title="Implement equality" brief="Test" acceptanceCriteria={[]} />',
  '<ExitCriteria items={[]} />',
  '</LessonStage>',
].join('\n');

test('review finding: published V3 uses real, exclusive three-stage lesson structure', () => {
  assert.doesNotThrow(() => assertFocusedLessonLayout(focusedV3, 'JAV-001'));
  const unwrapped = focusedV3.replaceAll(/<\/?LessonStage[^>]*>/g,'');
  assert.throws(() => assertFocusedLessonLayout(unwrapped, 'JAV-001'), /tiga LessonStage/);
  const missingStage = focusedV3.replace('<LessonStage stage="practice">', '');
  assert.throws(() => assertFocusedLessonLayout(missingStage, 'JAV-001'), /tiga LessonStage/);
  const swappedStages = focusedV3
    .replace('stage="understand"', 'stage="temporary"')
    .replace('stage="practice"', 'stage="understand"')
    .replace('stage="temporary"', 'stage="practice"');
  assert.throws(() => assertFocusedLessonLayout(swappedStages, 'JAV-001'), /Urutan atau nesting/);
});

test('review finding: canonical V3 components cannot leak into other views', () => {
  assert.throws(() => assertFocusedLessonLayout(
    focusedV3.replace('<Quiz items={[]} />','')
      .replace('<LearningSegments stage="understand"', '<Quiz items={[]} />\n<LearningSegments stage="understand"'),
    'JAV-001'
  ), /Quiz wajib/);
  const directLegacy = focusedV3.replace(
    '<LearningSegments stage="practice" segments={lessonSegments} />',
    '<GuidedPractice title="Legacy" prompt="test" hints={[]} explanation="legacy" />',
  );
  assert.throws(() => assertFocusedLessonLayout(directLegacy, 'JAV-001'), /LearningSegments V3/);
  const leaked = focusedV3 + '\n<Quiz items={[]} />';
  assert.throws(() => assertFocusedLessonLayout(leaked,'JAV-001'), /di luar LessonStage/);
});

test('unscoped text between and after sections cannot leak into every tab', () => {
  const between = focusedV3.replace(
    '</LessonStage>\n<LessonStage stage="practice">',
    '</LessonStage>\nUnscoped learning explanation\n<LessonStage stage="practice">',
  );
  assert.throws(() => assertFocusedLessonLayout(between, 'JAV-001'), /di luar LessonStage/);
  assert.throws(() => assertFocusedLessonLayout(focusedV3 + '\nUnscoped closing text', 'JAV-001'), /di luar LessonStage/);
});

test('review finding: source references are owned by Materi, not Project or Soal', () => {
  const misplaced = focusedV3.replace('<SourceList sources={[]} />','')
    .replace('<Challenge title=', '<SourceList sources={[]} />\n<Challenge title=');
  assert.throws(() => assertFocusedLessonLayout(misplaced,'JAV-001'), /SourceList wajib/);
  const omitted = focusedV3.replace('<SourceList sources={[]} />','');
  assert.throws(() => assertFocusedLessonLayout(omitted,'JAV-001'), /SourceList wajib/);
  const duplicated = focusedV3.replace('<SourceList sources={[]} />','<SourceList sources={[]} />\n<SourceList sources={[]} />');
  assert.throws(() => assertFocusedLessonLayout(duplicated,'JAV-001'), /SourceList wajib/);
});

test('V3 generator and golden fixture keep complete sources in understand stage', () => {
  for (const file of [
    '.agents/skill/course-generator/assets/lesson-template.mdx',
    'tests/golden/JAV-009.mdx',
  ]) {
    const content = readFileSync(file,'utf8');
    assert.doesNotThrow(() => assertFocusedLessonLayout(content,'JAV-009'), file);
  }
});

test('focused layout validation happens both before promotion and during published build', () => {
  const staging = readFileSync('scripts/validate-generation.ts','utf8');
  const published = readFileSync('scripts/validate-content.ts','utf8');
  assert.match(staging, /assertFocusedLessonLayout\(lesson, item\.id\)/);
  assert.match(published, /assertFocusedLessonLayout\(content, item\.id\)/);
});

test('unauthored outline CTA points to project, never missing quiz', () => {
  const content = readFileSync('src/components/library/ContentLibrary.astro','utf8');
  assert.match(content, /authored \? 'soal' : projectAvailable \? 'project'/);
  assert.match(content, /view === 'soal' && projectAvailable \? 'project'/);
});
