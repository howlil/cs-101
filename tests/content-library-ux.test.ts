import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import source from '../curriculum/manifest.v2.json';

const read = (path: string) => readFileSync(path, 'utf8');

test('published status is derived from reviewed authored lessons, not the manifest', () => {
  const page = read('src/pages/index.astro');
  const layout = read('src/layouts/AppLayout.astro');
  const explorer = read('src/components/curriculum/CurriculumExplorer.tsx');
  assert.match(page, /getCollection\('lessons', \(\{ data \}\) => !data\.demo\)/);
  assert.match(page, /publishedLessonIds=/);
  assert.match(layout, /item\.kind === 'unit' && published\.has\(item\.id\)/);
  assert.match(explorer, /item\.kind === 'unit' && item\.published/);
  assert.match(explorer, /Materi lengkap tersedia/);
  assert.deepEqual(source.items, []);
});

test('navigation anchors match item-specific content without duplicate checkpoint project', () => {
  const page = read('src/components/library/ContentLibrary.astro');
  assert.match(page, /isUnit && <section class="library-content-section library-project"/);
  assert.match(page, /isCheckpoint \? \(/);
  assert.match(page, /<a href="#materi">Masalah<\/a>/);
  assert.match(page, /<a href="#latihan">Praktik<\/a>/);
  assert.match(page, /<h3>\{challenge\.title\}<\/h3>/);
  assert.doesNotMatch(page, /requirements\.length\} requirements/);
});

test('reading surface avoids tabs illusion and compounded route animations', () => {
  const css = read('src/styles/library.css');
  const layout = read('src/layouts/AppLayout.astro');
  assert.doesNotMatch(css, /@keyframes library-content-enter/);
  assert.doesNotMatch(css, /border-bottom-color:var\(--foreground\); color:var\(--foreground\);/);
  assert.match(css, /max-width:68ch/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(layout, /fade\(\{duration:'0\.18s'\}\)/);
});
