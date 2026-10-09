import assert from 'node:assert/strict';
import test from 'node:test';
import { mapLessonHeadings } from '../src/domain/learning/lesson-headings';

test('TOC headings track their authored MDX stage', () => {
  const source = [
    '<LessonStage stage="understand">', '## Concepts', '</LessonStage>',
    '<LessonStage stage="practice">', '## Trial', '</LessonStage>',
    '<LessonStage stage="evidence">', '## Proof', '</LessonStage>',
  ].join('\n');
  const result = mapLessonHeadings(source, [
    { depth: 2, slug: 'concepts', text: 'Concepts' },
    { depth: 2, slug: 'trial', text: 'Trial' },
    { depth: 2, slug: 'proof', text: 'Proof' },
  ]);
  assert.deepEqual(result.map((heading) => heading.stage), ['understand', 'practice', 'evidence']);
  assert.deepEqual(result.map((heading) => heading.slug), ['concepts', 'trial', 'proof']);
});
