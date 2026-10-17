import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import manifest from '../curriculum/manifest.v2.json';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { selectLibraryItem } from '../src/domain/content-library';

test('curriculum reset leaves a valid empty source of truth', () => {
  const graph=buildCurriculumGraph(manifest);
  assert.equal(graph.manifest.version,2);
  assert.deepEqual(graph.manifest.tracks,[]);
  assert.deepEqual(graph.manifest.modules,[]);
  assert.deepEqual(graph.manifest.items,[]);
  assert.deepEqual(graph.manifest.relations,[]);
  assert.deepEqual(selectLibraryItem(graph,'java','JAV-001'),{trackId:'',item:undefined});
});
test('no authored lessons, staged content, generated records or review banks survive reset', () => {
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
