import actualManifest from '../curriculum/manifest.v2.json';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { curriculumItemFingerprint,parseManifestV2 } from '../src/domain/curriculum-v2/schema';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { getConnectionGroups,getItemLocation,getTrackExplorer } from '../src/domain/curriculum-v2/selectors';
const fp=<T extends object>(item:T)=>({...item,fingerprint:curriculumItemFingerprint(item)});
const unit={id:'JAV-001',kind:'unit' as const,trackId:'java',moduleId:'java-core',order:1,title:'Toolchain',scope:['JDK'],criteria:[{id:'c1',text:'Build works'}],challenge:{title:'Build',steps:['Run'],raw:'Build\n- Run'},prerequisites:[],marketExpectation:[],source:{title:'Dev.java',url:'https://dev.java/'},crossModuleReferenceRaw:[]};
const p1={id:'JAV-P01',kind:'checkpoint' as const,trackId:'java',moduleId:'java-core',order:2,title:'Project 1',problemStatement:'Build it',requirements:[{id:'r1',text:'Requirement A'}],prerequisites:['JAV-001'],source:{title:'Dev.java',url:'https://dev.java/'}};
const p2={...p1,id:'JAV-P02',order:3,title:'Project 2',parentProjectId:'JAV-P01',prerequisites:['JAV-001'],requirements:[{id:'inherit',text:'Includes every Project 1 requirement without weakening any invariant'},{id:'r2',text:'Requirement B'}]};
const integration={id:'INT-001',kind:'integration' as const,order:1,title:'Integration',brief:'Combine',scope:['Combine'],challenge:{title:'Combine',steps:[],raw:'Combine'},criteria:[{id:'i1',text:'Works'}],requirements:[],prerequisites:['JAV-001'],source:{title:'Plan'}};
const manifest={version:2 as const,tracks:[{id:'java',title:'Java',order:1}],modules:[{id:'java-core',trackId:'java',title:'Java Core',order:1}],items:[fp(unit),fp(p1),fp(p2),fp(integration)],relations:[{from:'JAV-001',to:'JAV-P01',type:'prerequisite' as const},{from:'JAV-001',to:'JAV-P02',type:'prerequisite' as const},{from:'JAV-P01',to:'JAV-P02',type:'project_parent' as const},{from:'JAV-001',to:'INT-001',type:'prerequisite' as const},{from:'JAV-001',to:'JAV-P01',type:'contributes_to' as const},{from:'JAV-001',to:'JAV-P02',type:'related' as const},{from:'JAV-001',to:'INT-001',type:'deep_dive' as const}]};
test('Manifest V2 memvalidasi hierarchy, graph, checkpoint, dan integration',()=>{const parsed=parseManifestV2(manifest),graph=buildCurriculumGraph(parsed);assert.equal(parsed.items.length,4);assert.deepEqual(getTrackExplorer(graph,'java').modules[0].items.map(x=>x.id),['JAV-001','JAV-P01','JAV-P02']);assert.equal(getItemLocation(graph,'JAV-P01').module?.title,'Java Core');const groups=getConnectionGroups(graph,'JAV-001');assert.deepEqual(groups.contributesTo.map(x=>x.item.id),['JAV-P01']);assert.deepEqual(groups.related.map(x=>x.item.id),['JAV-P02']);assert.deepEqual(groups.deepDive.map(x=>x.item.id),['INT-001']);});
test('Manifest V2 menolak prerequisite hilang dan siklus',()=>{const missing={...unit,prerequisites:['JAV-999']};assert.throws(()=>parseManifestV2({...manifest,items:manifest.items.map(x=>x.id==='JAV-001'?fp(missing):x),relations:[...manifest.relations,{from:'JAV-999',to:'JAV-001',type:'prerequisite' as const}]}),/Prerequisite tidak ditemukan|Relation item tidak ditemukan/);const cycled={...unit,prerequisites:['JAV-P02']};assert.throws(()=>parseManifestV2({...manifest,items:manifest.items.map(x=>x.id==='JAV-001'?fp(cycled):x),relations:[...manifest.relations,{from:'JAV-P02',to:'JAV-001',type:'prerequisite' as const}]}),/Siklus prerequisite/);});




test('contextual relation aktual tidak berubah menjadi hard prerequisite', () => {
  const graph = buildCurriculumGraph(actualManifest);
  const contextual = new Set(['foundation', 'related', 'deep_dive', 'contributes_to']);
  for (const relation of graph.manifest.relations) {
    if (!contextual.has(relation.type)) continue;
    const target = graph.itemsById.get(relation.to);
    assert.ok(target, `target relation hilang: ${relation.to}`);
    if (target!.prerequisites.includes(relation.from)) {
      // Allowed only if source also has an explicit prerequisite relation separately.
      assert.ok(
        graph.manifest.relations.some(
          (candidate) =>
            candidate.type === 'prerequisite' &&
            candidate.from === relation.from &&
            candidate.to === relation.to,
        ),
        `contextual relation diam-diam menjadi prerequisite: ${relation.from} -> ${relation.to}`,
      );
    }
  }
});
