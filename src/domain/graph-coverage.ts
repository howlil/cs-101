import type { LearningGraph, LearningLevel } from './learning-graph';
import { LEARNING_LEVELS } from './learning-graph';

export type GraphCoverage={
  totalItems:number;mappedItemCount:number;unmappedItemCount:number;
  totalConcepts:number;competencyOutcomes:number;
  byLevel:Record<LearningLevel,number>;
  applicationCount:number;relations:number;
  reviewedDependencies:number;proposedDependencies:number;
  unmappedPublished:string[];
  tracks:Array<{id:string;total:number;mapped:number;published:number;unmappedPublished:string[]}>;
  components:string[][];
};
/** Deterministic coverage of curated data; a mapped unit is not an authored lesson or achieved competency. */
export function reportGraphCoverage(graph:LearningGraph,published:ReadonlySet<string>):GraphCoverage{
  const items=graph.curriculum.manifest.items;
  const mapped=new Set(graph.applications.map(a=>a.itemId));
  const byLevel=Object.fromEntries(LEARNING_LEVELS.map(level=>[level,
    graph.concepts.filter(c=>c.outcomes.some(o=>o.level===level)).length])) as Record<LearningLevel,number>;
  const adjacency=new Map(graph.concepts.map(c=>[c.id,new Set<string>()]));
  for(const relation of graph.relations){
    adjacency.get(relation.from)!.add(relation.to);adjacency.get(relation.to)!.add(relation.from);
  }
  for(const dependency of graph.competencyDependencies){
    adjacency.get(dependency.from.conceptId)!.add(dependency.to.conceptId);
    adjacency.get(dependency.to.conceptId)!.add(dependency.from.conceptId);
  }
  const visited=new Set<string>(),components:string[][]=[];
  for(const concept of graph.concepts){
    if(visited.has(concept.id))continue;
    const group:string[]=[],queue=[concept.id];visited.add(concept.id);
    for(let at=0;at<queue.length;at++){
      const id=queue[at];group.push(id);
      for(const peer of adjacency.get(id)??[]){
        if(!visited.has(peer)){visited.add(peer);queue.push(peer);}
      }
    }
    components.push(group.sort());
  }
  const unmappedPublished=items.filter(i=>published.has(i.id)&&!mapped.has(i.id)).map(i=>i.id);
  const tracks=graph.curriculum.manifest.tracks.map(t=>{
    const units=items.filter(i=>i.kind==='unit'&&i.trackId===t.id);
    return {id:t.id,total:units.length,mapped:units.filter(i=>mapped.has(i.id)).length,
      published:units.filter(i=>published.has(i.id)).length,
      unmappedPublished:units.filter(i=>published.has(i.id)&&!mapped.has(i.id)).map(i=>i.id)};
  });
  return {
    totalItems:items.length,mappedItemCount:items.filter(i=>mapped.has(i.id)).length,
    unmappedItemCount:items.filter(i=>!mapped.has(i.id)).length,
    totalConcepts:graph.concepts.length,
    competencyOutcomes:graph.concepts.reduce((n,c)=>n+c.outcomes.length,0),
    byLevel,applicationCount:graph.applications.length,relations:graph.relations.length,
    reviewedDependencies:graph.competencyDependencies.filter(x=>x.status==='reviewed').length,
    proposedDependencies:graph.competencyDependencies.filter(x=>x.status==='proposed').length,
    unmappedPublished,tracks,components,
  };
}
