import { existsSync,readFileSync } from 'node:fs';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';

const manifest=JSON.parse(readFileSync('curriculum/manifest.v2.json','utf8'));
const graph=buildCurriculumGraph(manifest);
const units=graph.manifest.items.filter(item=>item.kind==='unit').length;
const checkpoints=graph.manifest.items.filter(item=>item.kind==='checkpoint').length;
const integrations=graph.manifest.items.filter(item=>item.kind==='integration').length;

if(existsSync('curriculum/import-report.json')){
  const report=JSON.parse(readFileSync('curriculum/import-report.json','utf8')) as {counts?:{warnings?:number};warnings?:unknown[]};
  const warnings=report.counts?.warnings??report.warnings?.length??0;
  if(warnings>0)console.warn('Curriculum import mempunyai '+warnings+' warning; lihat curriculum/import-report.json.');
}
console.log('Curriculum V2 valid: '+graph.manifest.tracks.length+' track, '+graph.manifest.modules.length+' module, '+units+' unit, '+checkpoints+' checkpoint, '+integrations+' integration.');
