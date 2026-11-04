import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { checkPublishedV3Files } from '../src/domain/generation/verification';
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
test('only canonical receipt-backed units become published; no stray review banks', () => {
  const graph=buildCurriculumGraph(manifest);
  const ids=readdirSync('src/content/lessons')
    .filter(name=>name.endsWith('.mdx')).map(name=>name.slice(0,-4)).sort();
  const banks=readdirSync('review-banks')
    .filter(name=>name.endsWith('.json')).map(name=>name.slice(0,-5)).sort();
  const receipts=readdirSync('generation/verified')
    .filter(name=>name.endsWith('.json')).map(name=>name.slice(0,-5)).sort();
  assert.deepEqual(banks,ids,'Every published lesson owns a bank, without orphan banks.');
  assert.deepEqual(receipts,ids,'Every published lesson owns an exactly matching V3 receipt.');
  for(const id of ids){
    const item=graph.itemsById.get(id);
    assert.equal(item?.kind,'unit','Published material must refer to a canonical curriculum unit.');
    if(!item||item.kind!=='unit')continue;
    const {receipt}=checkPublishedV3Files(process.cwd(),id,item.fingerprint);
    assert.equal(receipt.version,3);
  }
});
test('empty-state page does not ask for user data', () => {
  const page=readFileSync('src/components/library/EmptyCurriculum.astro','utf8');
  assert.match(page,/Belum ada materi/);
  assert.doesNotMatch(page,/<input|<form|streak/i);
});
