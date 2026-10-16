import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import source from '../curriculum/manifest.v2.json';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { libraryHref, projectIdeaFor, selectLibraryItem } from '../src/domain/content-library';

const graph = buildCurriculumGraph(source);

test('domain selector picks first curriculum item without learner state', () => {
  const selected = selectLibraryItem(graph, 'db-sql', null);
  assert.equal(selected.trackId, 'db-sql');
  assert.equal(selected.item?.id, 'SQL-001');
  const deepLink = selectLibraryItem(graph, 'java', 'NET-010');
  assert.equal(deepLink.trackId, 'networking');
  assert.equal(deepLink.item?.id, 'NET-010');
  assert.equal(selectLibraryItem(graph, 'missing', 'missing').item?.id, 'JAV-001');
});

test('unit and project deep links share the same page', () => {
  assert.equal(libraryHref('SQL-001'), '/?item=SQL-001');
  assert.equal(libraryHref('JAV-P01'), '/?item=JAV-P01');
  const java = graph.itemsById.get('JAV-003');
  assert.ok(java);
  assert.equal(projectIdeaFor(graph, java)?.kind, 'checkpoint');
  assert.equal(projectIdeaFor(graph, graph.itemsById.get('JAV-P01')!)?.id, 'JAV-P01');
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
