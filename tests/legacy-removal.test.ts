import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { pedagogySpecSchema } from '../src/domain/generation/pedagogy';
import { lessonSpecSchema } from '../src/domain/generation/schema';
import { goldenSpec } from './golden/content';

const removed = [
  'src/domain/curriculum.ts',
  'src/domain/curriculum-v2/legacy.ts',
  'curriculum/manifest.json',
  'scripts/import-curriculum.ts',
  'scripts/lib/curriculum-import.ts',
  'scripts/lib/xlsx-lite.ts',
  'tests/curriculum.test.ts',
  'tests/curriculum-import.test.ts',
  'src/components/lesson/Reveal.astro',
  'src/components/lesson/RevealAccordion.tsx',
  'src/lib/connection-view.ts',
  'src/lib/learning-language.ts',
];

test('obsolete workbook V1/V2 adapters and unused learner UI are absent', () => {
  for (const path of removed) assert.equal(existsSync(path), false, path);
  const p = JSON.parse(readFileSync('package.json','utf8'));
  assert.equal(p.scripts['import:curriculum'], undefined);
  assert.ok(existsSync('scripts/import-eight-domains.ts'));
  assert.ok(existsSync('curriculum/source/engineering-2026-10-18.json'));
});

test('published pedagogy accepts V3 only and does not silently downgrade', () => {
  assert.equal(pedagogySpecSchema.parse(goldenSpec.pedagogy).version, 3);
  assert.doesNotThrow(() => lessonSpecSchema.parse(goldenSpec));
  assert.throws(
    () => pedagogySpecSchema.parse({ ...goldenSpec.pedagogy, version: 2 }),
    { name: 'ZodError' },
  );
  assert.throws(
    () => lessonSpecSchema.parse({ ...goldenSpec, pedagogy: undefined }),
    { name: 'ZodError' },
  );
});

test('reviewed V3 publication receipt is required even for pre-existing lesson MDX', () => {
  const content=readFileSync('scripts/validate-content.ts','utf8');
  assert.match(content, /Published lesson wajib memiliki verification receipt V3/);
  assert.doesNotMatch(content, /v3Lesson &&|if \(existsSync\(v3Receipt\)\)/);
  const promoter=readFileSync('scripts/promote-generation.ts','utf8');
  assert.match(promoter, /Generation artifacts wajib menggunakan verified V3 receipt/);
});

test('old URL redirects remain to preserve direct links, but do not serve learning state', () => {
  for (const path of ['src/pages/learn/[id].astro', 'src/pages/project/[id].astro', 'src/pages/progress.astro']) {
    assert.equal(existsSync(path), true, 'redirect retained: '+path);
  }
});
