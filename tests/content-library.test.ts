import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import source from '../curriculum/manifest.v2.json';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { libraryHref, selectLibraryItem } from '../src/domain/content-library';

const graph = buildCurriculumGraph(source);

test('8-domain curriculum resolves direct item links and falls back to a real topic', () => {
  const a=selectLibraryItem(graph,'database',null);
  const b=selectLibraryItem(graph,'java','JAV-009');
  const c=selectLibraryItem(graph,'missing','missing');
  assert.equal(a.item?.id,'SQL-001');
  assert.equal(b.item?.id,'JAV-009');
  assert.equal(c.item?.id,'JAV-001');
  assert.equal(c.trackId,'java');
});
test('link generator stays compatible with future lesson and project IDs',()=>{
  assert.equal(libraryHref('SQL-001'),'/?item=SQL-001');
  assert.equal(libraryHref('JAV-P01'),'/?item=JAV-P01');
});

test('no writable learner routes, D1 binding, or tracking controls remain', () => {
  assert.equal(existsSync('src/pages/api'), false);
  assert.equal(existsSync('src/server/learning'), false);
  assert.equal(existsSync('src/components/learning'), false);
  assert.doesNotMatch(readFileSync('wrangler.jsonc', 'utf8'), /LEARNING_DB/);
  const layout = readFileSync('src/layouts/AppLayout.astro', 'utf8');
  assert.doesNotMatch(layout, /snapshotForRequest|learning\(\)|ProgressPage/);
  const page = readFileSync('src/pages/index.astro', 'utf8');
  assert.match(page, /ContentLibrary/);
  assert.doesNotMatch(page, /snapshotForRequest|learning\(\)/);
});
