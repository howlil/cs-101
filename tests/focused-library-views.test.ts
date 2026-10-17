import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { libraryViewHref, resolveLibraryView } from '../src/domain/content-library';

test('view deep links select one focused surface and use safe defaults', () => {
  assert.equal(resolveLibraryView(null, 'unit'), 'materi');
  assert.equal(resolveLibraryView('materi', 'unit'), 'materi');
  assert.equal(resolveLibraryView('soal', 'unit'), 'soal');
  assert.equal(resolveLibraryView('project', 'unit'), 'project');
  assert.equal(resolveLibraryView('unexpected', 'unit'), 'materi');
  assert.equal(resolveLibraryView('soal', 'checkpoint'), 'project');
  assert.equal(resolveLibraryView('materi', 'integration'), 'project');

  assert.equal(libraryViewHref('JAV-009', 'materi'), '/?item=JAV-009');
  assert.equal(libraryViewHref('JAV-009', 'soal'), '/?item=JAV-009&view=soal');
  assert.equal(libraryViewHref('JAV-009', 'project'), '/?item=JAV-009&view=project');
  assert.equal(libraryViewHref('JAV-P01', 'project'), '/?item=JAV-P01&view=project');
});

test('each authored MDX stage is conditionally rendered, not CSS-hidden', () => {
  const component = readFileSync('src/components/lesson/LessonStage.astro','utf8');
  assert.match(component, /resolveLibraryView\(Astro\.url\.searchParams\.get\('view'\), 'unit'\)/);
  assert.match(component, /current === selected\.view && \(/);
  assert.match(component, /<slot \/>/);
  assert.match(component, /understand: .*view: 'materi'/);
  assert.match(component, /practice: .*view: 'soal'/);
  assert.match(component, /evidence: .*view: 'project'/);
  assert.doesNotMatch(component, /display:\s*none|hidden=|visibility:\s*hidden/);
});

test('plain curriculum outlines have separate learning, question and project branches', () => {
  const content = readFileSync('src/components/library/ContentLibrary.astro','utf8');
  const index = readFileSync('src/pages/index.astro','utf8');
  const css = readFileSync('src/styles/library.css','utf8');
  assert.match(index,/view=\{view\}/);
  assert.match(content,/isUnit && view === 'materi'/);
  assert.match(content,/isUnit && view === 'soal'/);
  assert.match(content,/project \? \(/);
  assert.match(content,/Soal dan pembahasan belum diterbitkan/);
  assert.match(content,/libraryViewHref\(project\.id, 'project'\)/);
  assert.match(css,/\.library-view-link\.is-current/);
  assert.doesNotMatch(content,/href="#materi"|href="#latihan"|href="#ide-project"/);
  assert.doesNotMatch(content,/<form|<input|progressStore|streak|sessionStorage/);
});
