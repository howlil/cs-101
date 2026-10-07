import { parseManifestV2,type CurriculumItem,type CurriculumManifestV2,type CurriculumModule,type Relation,type Track } from './schema';
export type CurriculumGraph={manifest:CurriculumManifestV2;tracksById:Map<string,Track>;modulesById:Map<string,CurriculumModule>;itemsById:Map<string,CurriculumItem>;moduleItems:Map<string,string[]>;prerequisites:Map<string,string[]>;dependents:Map<string,string[]>;relationsFrom:Map<string,Relation[]>;relationsTo:Map<string,Relation[]>;projectChildren:Map<string,string[]>};
function push<K,V>(map:Map<K,V[]>,key:K,value:V){const values=map.get(key)??[];values.push(value);map.set(key,values);}
export function buildCurriculumGraph(input:unknown):CurriculumGraph{
  const manifest=parseManifestV2(input),tracksById=new Map(manifest.tracks.map(x=>[x.id,x])),modulesById=new Map(manifest.modules.map(x=>[x.id,x])),itemsById=new Map(manifest.items.map(x=>[x.id,x])),moduleItems=new Map<string,string[]>(),prerequisites=new Map<string,string[]>(),dependents=new Map<string,string[]>(),relationsFrom=new Map<string,Relation[]>(),relationsTo=new Map<string,Relation[]>(),projectChildren=new Map<string,string[]>();
  for(const item of manifest.items){prerequisites.set(item.id,[...item.prerequisites]);if(item.kind!=='integration')push(moduleItems,item.moduleId,item.id);for(const prerequisite of item.prerequisites)push(dependents,prerequisite,item.id);if(item.kind==='checkpoint'&&item.parentProjectId)push(projectChildren,item.parentProjectId,item.id);}
  for(const relation of manifest.relations){push(relationsFrom,relation.from,relation);push(relationsTo,relation.to,relation);}
  for(const[moduleId,ids]of moduleItems){ids.sort((a,b)=>itemsById.get(a)!.order-itemsById.get(b)!.order||a.localeCompare(b));moduleItems.set(moduleId,ids);}
  return{manifest,tracksById,modulesById,itemsById,moduleItems,prerequisites,dependents,relationsFrom,relationsTo,projectChildren};
}
