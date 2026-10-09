import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const at = (path: string) => new URL('../' + path, import.meta.url);
const read = (path: string) => readFileSync(at(path), 'utf8');

test('retired UI component directories cannot silently return', () => {
  for (const folder of ['course', 'search', 'project']) {
    assert.equal(existsSync(at('src/components/' + folder)), false, folder);
  }
  assert.match(read('scripts/validate-architecture.ts'), /retiredUI/);
  assert.match(read('scripts/validate-architecture.ts'), /mdx/);
});

test('lesson MDX and generator template import from the canonical owner', () => {
  const lessons = ['SQL-001', 'SQL-002', 'JAV-001'];
  for (const name of lessons) {
    const mdx = read('src/content/lessons/' + name + '.mdx');
    assert.match(mdx, /components\/lesson\//);
    assert.doesNotMatch(mdx, /components\/course\//);
  }
  const template = read('.agents/skill/course-generator/assets/lesson-template.mdx');
  assert.match(template, /components\/lesson\//);
  assert.doesNotMatch(template, /components\/course\//);
});

test('global controls, lesson presentation, learning forms have one owner', () => {
  for (const path of [
    'src/components/app/CurriculumSearch.tsx',
    'src/components/app/ThemePreference.tsx',
    'src/components/lesson/Quiz.astro',
    'src/components/lesson/QuizClient.tsx',
    'src/components/lesson/RevealAccordion.tsx',
    'src/components/learning/SessionLogger.tsx',
    'src/components/learning/ProjectEvidence.tsx',
    'src/components/learning/IntegrationEvidence.tsx',
    'src/components/learning/ReviewAttempt.tsx',
    'src/components/pages/GuaranteeAccordion.tsx',
  ]) {
    assert.ok(existsSync(at(path)), path);
  }
});
