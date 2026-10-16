import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (file: string) => readFileSync(file, 'utf8');

test('content library navigation uses domain selector and modules only', () => {
  const sidebar = read('src/components/curriculum/CurriculumExplorer.tsx');
  assert.match(sidebar, /Select label="DOMAIN"/);
  assert.match(sidebar, /<Accordion /);
  assert.doesNotMatch(sidebar, /search|\bInput\b|\bCommandPalette\b/i);

  const header = read('src/components/app/AppShell.tsx');
  assert.doesNotMatch(header, /CurriculumSearch|CommandPalette|Search\s*\(/);
  const layout = read('src/layouts/AppLayout.astro');
  assert.doesNotMatch(layout, /searchEntries/);
  assert.equal(existsSync('src/components/app/CurriculumSearch.tsx'), false);
  assert.equal(existsSync('src/components/app/curriculum-search.module.css'), false);
});
