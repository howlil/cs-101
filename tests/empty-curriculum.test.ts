import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import manifest from '../curriculum/manifest.v2.json';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { selectLibraryItem } from '../src/domain/content-library';

test('workbook rollout restores eight domains as outlines, without invented graph edges', () => {
  const graph=buildCurriculumGraph(manifest);
  assert.equal(graph.manifest.version,2);
  assert.equal(graph.manifest.tracks.length,8);
  assert.equal(graph.manifest.modules.length,67);
  assert.equal(graph.manifest.items.length,370);
  assert.deepEqual(graph.manifest.relations,[]);
  assert.equal(selectLibraryItem(graph,'java','JAV-009').item?.id,'JAV-009');
});
test('outlines do not silently become published MDX or generated review banks', () => {
  const list=(path:string)=>readdirSync(path,{recursive:true}).map(String);
  assert.deepEqual(list('src/content/lessons').filter(x=>x.endsWith('.mdx')),[]);
  assert.deepEqual(list('review-banks').filter(x=>x.endsWith('.json')),[]);
  assert.deepEqual(list('generation').filter(x=>x.endsWith('.mdx')||x.endsWith('.json')),[]);
});
test('empty-state page does not ask for user data', () => {
  const page=readFileSync('src/components/library/EmptyCurriculum.astro','utf8');
  assert.match(page,/Belum ada materi/);
  assert.doesNotMatch(page,/<input|<form|streak/i);
});
