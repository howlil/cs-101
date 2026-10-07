import type { CurriculumGraph } from './graph';
import type { ProjectCheckpoint } from './schema';
export function getTrackExplorer(graph:CurriculumGraph,trackId:string){const track=graph.tracksById.get(trackId);if(!track)throw new Error('Track tidak ditemukan: '+trackId);const modules=[...graph.modulesById.values()].filter(x=>x.trackId===trackId).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id)).map(module=>({...module,items:(graph.moduleItems.get(module.id)??[]).map(id=>graph.itemsById.get(id)!)}));return{track,modules};}
export function getItemConnections(graph:CurriculumGraph,itemId:string){if(!graph.itemsById.has(itemId))throw new Error('Item tidak ditemukan: '+itemId);return{prerequisites:graph.prerequisites.get(itemId)??[],dependents:graph.dependents.get(itemId)??[],outgoing:graph.relationsFrom.get(itemId)??[],incoming:graph.relationsTo.get(itemId)??[]};}
const normalizeRequirement=(text:string)=>text.toLowerCase().replace(/\s+/g,' ').trim();
const inheritanceClause=(text:string)=>/^(includes|inherits|retains|preserves)\s+(every|all)\b/i.test(text.trim());

export function getProjectDelta(graph:CurriculumGraph,projectId:string){
  const project=graph.itemsById.get(projectId);
  if(!project||project.kind!=='checkpoint')throw new Error('Checkpoint tidak ditemukan: '+projectId);
  if(!project.parentProjectId){
    return{project,parent:undefined,inherited:[],inheritanceClauses:[],added:project.requirements};
  }

  const parent=graph.itemsById.get(project.parentProjectId);
  if(!parent||parent.kind!=='checkpoint')throw new Error('Project parent tidak valid: '+projectId);

  const inheritanceClauses=project.requirements.filter(x=>inheritanceClause(x.text));
  if(inheritanceClauses.length){
    return{
      project,
      parent,
      inherited:parent.requirements,
      inheritanceClauses,
      added:project.requirements.filter(x=>!inheritanceClause(x.text)),
    };
  }

  const previous=new Set(parent.requirements.map(x=>normalizeRequirement(x.text)));
  return{
    project,
    parent,
    inherited:project.requirements.filter(x=>previous.has(normalizeRequirement(x.text))),
    inheritanceClauses:[],
    added:project.requirements.filter(x=>!previous.has(normalizeRequirement(x.text))),
  };
}

export function getProjectNavigation(graph:CurriculumGraph,projectId:string){
  const project=graph.itemsById.get(projectId);
  if(!project||project.kind!=='checkpoint')throw new Error('Checkpoint tidak ditemukan: '+projectId);
  const parent=project.parentProjectId?graph.itemsById.get(project.parentProjectId):undefined;
  const children=(graph.projectChildren.get(project.id)??[])
    .map(id=>graph.itemsById.get(id))
    .filter((item):item is ProjectCheckpoint=>item?.kind==='checkpoint')
    .sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
  return{
    project,
    parent:parent?.kind==='checkpoint'?parent:undefined,
    children,
    next:children[0],
  };
}

export function getItemLocation(graph:CurriculumGraph,itemId:string){
  const item=graph.itemsById.get(itemId);
  if(!item)throw new Error('Item tidak ditemukan: '+itemId);
  if(item.kind==='integration')return{item,track:undefined,module:undefined};
  const track=graph.tracksById.get(item.trackId);
  const module=graph.modulesById.get(item.moduleId);
  if(!track||!module)throw new Error('Lokasi item tidak valid: '+itemId);
  return{item,track,module};
}

export type CurriculumSearchEntry={
  itemId:string;
  title:string;
  kind:'unit'|'checkpoint'|'integration';
  trackId?:string;
  trackTitle?:string;
  moduleId?:string;
  moduleTitle?:string;
  searchText:string;
};

export function buildCurriculumSearchIndex(graph:CurriculumGraph):CurriculumSearchEntry[]{
  return graph.manifest.items.map((item)=>{
    const location=getItemLocation(graph,item.id);
    const searchable=item.kind==='unit'
      ? item.scope
      : item.kind==='integration'
        ? item.scope
        : [];
    const searchText=[
      item.id,
      item.title,
      location.track?.title??'',
      location.module?.title??'',
      ...searchable,
    ].join(' ').toLocaleLowerCase('id-ID');
    return{
      itemId:item.id,
      title:item.title,
      kind:item.kind,
      trackId:location.track?.id,
      trackTitle:location.track?.title,
      moduleId:location.module?.id,
      moduleTitle:location.module?.title,
      searchText,
    };
  }).sort((a,b)=>{
    const trackA=a.trackId?graph.tracksById.get(a.trackId)?.order??999:999;
    const trackB=b.trackId?graph.tracksById.get(b.trackId)?.order??999:999;
    if(trackA!==trackB)return trackA-trackB;
    const moduleA=a.moduleId?graph.modulesById.get(a.moduleId)?.order??999:999;
    const moduleB=b.moduleId?graph.modulesById.get(b.moduleId)?.order??999:999;
    if(moduleA!==moduleB)return moduleA-moduleB;
    return a.itemId.localeCompare(b.itemId);
  });
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

export function itemHref(graph:CurriculumGraph,itemId:string){
  const item=graph.itemsById.get(itemId);
  if(!item)throw new Error('Item tidak ditemukan: '+itemId);
  if(item.kind==='unit')return '/learn/'+encodeURIComponent(item.id);
  if(item.kind==='checkpoint')return '/project/'+encodeURIComponent(item.id);
  return '/integration/'+encodeURIComponent(item.id);
}


export function searchCurriculum(
  index: CurriculumSearchEntry[],
  rawQuery: string,
  limit = 12,
) {
  const query = rawQuery.trim().toLocaleLowerCase('id-ID');
  if (!query) return [];

  const terms = query.split(/\s+/).filter(Boolean);

  return index
    .map((entry) => {
      const id = entry.itemId.toLocaleLowerCase('id-ID');
      const title = entry.title.toLocaleLowerCase('id-ID');
      const track = entry.trackTitle?.toLocaleLowerCase('id-ID') ?? '';
      const module = entry.moduleTitle?.toLocaleLowerCase('id-ID') ?? '';
      const haystack = entry.searchText;

      if (!terms.every((term) => haystack.includes(term))) return undefined;

      let score = 0;
      if (id === query) score += 120;
      else if (id.startsWith(query)) score += 100;
      else if (id.includes(query)) score += 80;

      if (title === query) score += 90;
      else if (title.startsWith(query)) score += 70;
      else if (title.includes(query)) score += 55;

      if (module === query || track === query) score += 45;
      else if (module.includes(query) || track.includes(query)) score += 30;

      score += terms.reduce((sum, term) => sum + (haystack.includes(term) ? 5 : 0), 0);

      return { entry, score };
    })
    .filter((result): result is { entry: CurriculumSearchEntry; score: number } => !!result)
    .sort((a, b) => b.score - a.score || a.entry.itemId.localeCompare(b.entry.itemId))
    .slice(0, limit)
    .map((result) => result.entry);
}
