import type { CurriculumGraph } from './graph';
export function getTrackExplorer(graph:CurriculumGraph,trackId:string){const track=graph.tracksById.get(trackId);if(!track)throw new Error('Track tidak ditemukan: '+trackId);const modules=[...graph.modulesById.values()].filter(x=>x.trackId===trackId).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id)).map(module=>({...module,items:(graph.moduleItems.get(module.id)??[]).map(id=>graph.itemsById.get(id)!)}));return{track,modules};}
export function getItemLocation(graph:CurriculumGraph,itemId:string){
  const item=graph.itemsById.get(itemId);
  if(!item)throw new Error('Item tidak ditemukan: '+itemId);
  if(item.kind==='integration')return{item,track:undefined,module:undefined};
  const track=graph.tracksById.get(item.trackId);
  const module=graph.modulesById.get(item.moduleId);
  if(!track||!module)throw new Error('Lokasi item tidak valid: '+itemId);
  return{item,track,module};
}

export type ConnectionEntry={
  item:import('./schema').CurriculumItem;
  relationType:'prerequisite'|'foundation'|'related'|'deep_dive'|'contributes_to'|'project_parent';
};

function uniqueConnectionEntries(entries:ConnectionEntry[]){
  const seen=new Set<string>();
  return entries.filter((entry)=>{
    const key=entry.item.id+'\0'+entry.relationType;
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  });
}

export function getConnectionGroups(graph:CurriculumGraph,itemId:string){
  const item=graph.itemsById.get(itemId);
  if(!item)throw new Error('Item tidak ditemukan: '+itemId);

  const resolve=(id:string,type:ConnectionEntry['relationType']):ConnectionEntry|undefined=>{
    const target=graph.itemsById.get(id);
    return target?{item:target,relationType:type}:undefined;
  };

  const requires=(graph.prerequisites.get(itemId)??[])
    .map(id=>resolve(id,'prerequisite'))
    .filter((entry):entry is ConnectionEntry=>!!entry);

  const usedLaterBy=(graph.dependents.get(itemId)??[])
    .map(id=>resolve(id,'prerequisite'))
    .filter((entry):entry is ConnectionEntry=>!!entry);

  const outgoing=graph.relationsFrom.get(itemId)??[];
  const incoming=graph.relationsTo.get(itemId)??[];

  const related=uniqueConnectionEntries([
    ...outgoing.filter(r=>r.type==='related').map(r=>resolve(r.to,'related')),
    ...incoming.filter(r=>r.type==='related').map(r=>resolve(r.from,'related')),
  ].filter((entry):entry is ConnectionEntry=>!!entry));

  const deepDive=uniqueConnectionEntries(
    outgoing
      .filter(r=>r.type==='deep_dive')
      .map(r=>resolve(r.to,'deep_dive'))
      .filter((entry):entry is ConnectionEntry=>!!entry)
  );

  const foundationFor=uniqueConnectionEntries(
    outgoing
      .filter(r=>r.type==='foundation')
      .map(r=>resolve(r.to,'foundation'))
      .filter((entry):entry is ConnectionEntry=>!!entry)
  );

  const builtOnFoundation=uniqueConnectionEntries(
    incoming
      .filter(r=>r.type==='foundation')
      .map(r=>resolve(r.from,'foundation'))
      .filter((entry):entry is ConnectionEntry=>!!entry)
  );

  const contributesTo=uniqueConnectionEntries(
    outgoing
      .filter(r=>r.type==='contributes_to')
      .map(r=>resolve(r.to,'contributes_to'))
      .filter((entry):entry is ConnectionEntry=>!!entry)
  );

  return{
    requires,
    usedLaterBy,
    related,
    deepDive,
    foundationFor,
    builtOnFoundation,
    contributesTo,
  };
}

