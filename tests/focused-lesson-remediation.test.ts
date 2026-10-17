import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertFocusedLessonLayout } from '../src/domain/generation/focused-lesson-layout';

const legacyV2 = [
  '---', 'taskId: "JAV-001"', 'demo: false', '---',
  "import LessonStage from '../../components/lesson/LessonStage.astro';",
  '<LessonStage stage="understand">',
  '## Understand',
  '<MentalModel title="Identity">Identity vs equality</MentalModel>',
  '<ConceptGraph>Objects and values</ConceptGraph>',
  '<WorkedExample problem="Different instances" steps={[]} />',
  '<SourceList sources={[]} />',
  '</LessonStage>',
  '<LessonStage stage="practice">',
  '## Practice',
  '<GuidedPractice prompt="Try equality" hints={[]} explanation="Try again" />',
  '<Quiz items={[]} />',
  '</LessonStage>',
  '<LessonStage stage="evidence">',
  '## Project',
  '<Challenge title="Implement equality" brief="Test" acceptanceCriteria={[]} />',
  '<ExitCriteria items={[]} />',
  '</LessonStage>',
].join('\n');

test('review finding: published V2 uses real, exclusive three-stage lesson structure', () => {
  assert.doesNotThrow(() => assertFocusedLessonLayout(legacyV2, 'JAV-001'));
  const unwrapped = legacyV2.replaceAll(/<\/?LessonStage[^>]*>/g,'');
  assert.throws(() => assertFocusedLessonLayout(unwrapped, 'JAV-001'), /tiga LessonStage/);
  const missingStage = legacyV2.replace('<LessonStage stage="practice">', '');
  assert.throws(() => assertFocusedLessonLayout(missingStage, 'JAV-001'), /tiga LessonStage/);
  const swappedStages = legacyV2
    .replace('stage="understand"', 'stage="temporary"')
    .replace('stage="practice"', 'stage="understand"')
    .replace('stage="temporary"', 'stage="practice"');
  assert.throws(() => assertFocusedLessonLayout(swappedStages, 'JAV-001'), /Urutan atau nesting/);
});

test('review finding: learning objects cannot leak into other views', () => {
  assert.throws(() => assertFocusedLessonLayout(
    legacyV2.replace('<Quiz items={[]} />','')
      .replace('<WorkedExample problem=', '<Quiz items={[]} />\n<WorkedExample problem='),
    'JAV-001'
  ), /Quiz wajib/);
  const misplacedPractice = legacyV2.replace('<GuidedPractice prompt="Try equality" hints={[]} explanation="Try again" />','')
    .replace('<WorkedExample problem=', '<GuidedPractice prompt="Try equality" hints={[]} explanation="Try again" />\n<WorkedExample problem=');
  assert.throws(() => assertFocusedLessonLayout(misplacedPractice,'JAV-001'), /GuidedPractice wajib/);
  const leaked = legacyV2 + '\n<Quiz items={[]} />';
  assert.throws(() => assertFocusedLessonLayout(leaked,'JAV-001'), /di luar LessonStage/);
});

test('unscoped text between and after sections cannot leak into every tab', () => {
  const between = legacyV2.replace(
    '</LessonStage>\n<LessonStage stage="practice">',
    '</LessonStage>\nUnscoped learning explanation\n<LessonStage stage="practice">',
  );
  assert.throws(() => assertFocusedLessonLayout(between, 'JAV-001'), /di luar LessonStage/);
  assert.throws(() => assertFocusedLessonLayout(legacyV2 + '\nUnscoped closing text', 'JAV-001'), /di luar LessonStage/);
});

test('review finding: source references are owned by Materi, not Project or Soal', () => {
  const misplaced = legacyV2.replace('<SourceList sources={[]} />','')
    .replace('<Challenge title=', '<SourceList sources={[]} />\n<Challenge title=');
  assert.throws(() => assertFocusedLessonLayout(misplaced,'JAV-001'), /SourceList wajib/);
  const omitted = legacyV2.replace('<SourceList sources={[]} />','');
  assert.throws(() => assertFocusedLessonLayout(omitted,'JAV-001'), /SourceList wajib/);
  const duplicated = legacyV2.replace('<SourceList sources={[]} />','<SourceList sources={[]} />\n<SourceList sources={[]} />');
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
