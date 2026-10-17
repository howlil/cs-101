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
  assert.equal(source.items.length,370);
  assert.equal(source.items.some((item)=>item.kind==='unit'&&item.id==='JAV-009'),true);
});

test('real focused sections replace anchor jumps without duplicating the project', () => {
  const page = read('src/components/library/ContentLibrary.astro');
  assert.match(page, /view === 'materi'/);
  assert.match(page, /view === 'soal'/);
  assert.match(page, /libraryViewHref\(item\.id, tab\.id\)/);
  assert.match(page, /aria-current=\{view === tab\.id \? 'page'/);
  assert.match(page, /isCheckpoint \? \(/);
  assert.match(page, /<h3>\{challenge\.title\}<\/h3>/);
  assert.doesNotMatch(page, /href="#materi"|href="#latihan"|href="#ide-project"/);
  assert.doesNotMatch(page, /requirements\.length\} requirements/);
});

test('reading surface keeps compact monochrome navigation without redundant transitions', () => {
  const css = read('src/styles/library.css');
  const layout = read('src/layouts/AppLayout.astro');
  assert.doesNotMatch(css, /@keyframes library-content-enter/);
  assert.doesNotMatch(css, /border-bottom-color:var\(--foreground\); color:var\(--foreground\);/);
  assert.match(css, /max-width:68ch/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(layout, /fade\(\{duration:'0\.18s'\}\)/);
});
