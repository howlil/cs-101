import {test} from 'node:test';
import assert from 'node:assert/strict';
import source from '../curriculum/source/engineering-2026-10-18.json';
import manifest from '../curriculum/manifest.v2.json';
import {importEightDomainSnapshot} from '../scripts/lib/eight-domain-import';
import {parseManifestV2} from '../src/domain/curriculum-v2/schema';
test('M5 deterministic source import',()=>{
  const {manifest:generated,report}=importEightDomainSnapshot(source);
  assert.deepEqual(generated,manifest);
  assert.doesNotThrow(()=>parseManifestV2(manifest));
  assert.equal(report.counts.tracks,8);
  assert.equal(report.counts.modules,67);
  assert.equal(report.counts.units,370);
  assert.deepEqual(report.counts.priorities,{P0:225,P1:123,P2:22});
  assert.equal(manifest.items.find(x=>x.id==='JAV-009')?.title,'Duplicate Payment Checker');
  assert.equal(manifest.items.find(x=>x.id==='SQL-001')?.title,'SQL Workbench');
});
test('Source outlines do not fabricate ungrounded hard prerequisites',()=>{
  assert.deepEqual(manifest.relations,[]);
  assert.equal(manifest.items.filter(x=>x.kind==='checkpoint').length,0);
  for(const item of manifest.items){
    if(item.kind!=='unit')throw new Error('Only source-grounded units should be imported.');
    assert.equal(item.prerequisites.length,0);
    assert.ok(item.source.url?.startsWith('https://'));
    assert.ok(/^P[012] · /.test(item.challenge.raw));
  }
});
