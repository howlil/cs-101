import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

test('reading-first header removes repeated metadata and filler text', () => {
  const page = read('src/components/library/ContentLibrary.astro');
  const layout = read('src/layouts/AppLayout.astro');
  assert.doesNotMatch(page, /Materi, latihan soal, dan implementasi praktis dalam satu halaman\./);
  assert.match(page, /\[trackTitle \?\? 'Integrasi', moduleTitle, item\.id\]/);
  assert.doesNotMatch(layout, /class="brand"/);
  assert.doesNotMatch(layout, /class="current-track"/);
});

test('sidebar keeps the active module first and hides secondary navigation by default', () => {
  const explorer = read('src/components/curriculum/CurriculumExplorer.tsx');
  const sidebar = read('src/components/app/AppSidebar.tsx');
  assert.match(explorer, /selectedModuleIndex/);
  assert.match(explorer, /defaultOpen = activeIntegration/);
  assert.match(explorer, /title: 'Integrasi lintas domain'/);
  assert.doesNotMatch(explorer, /curriculum-tree-heading">.*ITEMS/);
  assert.doesNotMatch(sidebar, /SidebarFooter|Engineering Library/);
});

test('accessible lesson heading is retained without visual duplication', () => {
  const css = read('src/styles/library.css');
  assert.match(css, /\[data-lesson-stage="understand"\]/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
