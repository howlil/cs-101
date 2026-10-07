import { parseManifest,type Task } from '../curriculum';
import type { CurriculumGraph } from './graph';
export function toLegacyManifestV1(graph:CurriculumGraph){
  const trackOrder=new Map(graph.manifest.tracks.map(x=>[x.id,x.order]));
  const tasks:Task[]=graph.manifest.items.map(item=>{const module=item.kind==='integration'?undefined:graph.modulesById.get(item.moduleId);const criteria=item.kind==='unit'?item.criteria:item.kind==='checkpoint'?item.requirements:[...item.criteria,...item.requirements];const challenge=item.kind==='unit'?item.challenge.raw:item.kind==='checkpoint'?item.problemStatement:item.challenge.raw||item.brief;const track=item.kind==='integration'?'integration':item.trackId;const order=item.kind==='integration'?900_000+item.order:(trackOrder.get(item.trackId)??999)*1_000+item.order;return{taskId:item.id,title:item.title,track,phase:module?.order??1,order,prerequisites:[...item.prerequisites],criteria:criteria.map(x=>({...x})),challenge,projectRequirements:[]};});
  return parseManifest({version:1,tasks});
}
