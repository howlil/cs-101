import { z } from 'zod';
import { curriculumSlugSchema, itemIdSchema } from './curriculum-v2/schema';
import type { CurriculumGraph } from './curriculum-v2/graph';

export const LEARNING_LEVELS=['G0','G1','G2','G3','G4'] as const;
export type LearningLevel=typeof LEARNING_LEVELS[number];
const levelSchema=z.enum(LEARNING_LEVELS);
const evidenceKindSchema=z.enum(['design-review','framework-test','network-lab','packet-trace','cluster-test']);
export const EVIDENCE_KIND_LABELS:Record<z.infer<typeof evidenceKindSchema>,string>={
  'design-review':'Reasoned design review',
  'framework-test':'Framework integration test',
  'network-lab':'Real Linux network lab',
  'packet-trace':'Observed packet trace',
  'cluster-test':'Live dependency / Kubernetes test',
};
const criterionSchema=z.object({
  id:curriculumSlugSchema,itemId:itemIdSchema,evidenceKind:evidenceKindSchema,
  check:z.string().min(1),passWhen:z.string().min(1),
});
const assessmentSchema=z.object({task:z.string().min(1),criteria:z.array(criterionSchema).min(1)});
const outcomeSchema=z.object({
  level:levelSchema,competency:z.string().min(1),evidence:z.string().min(1),
  itemIds:z.array(itemIdSchema).min(1),status:z.enum(['proposed','reviewed']),
  assessment:assessmentSchema,
});
const conceptSchema=z.object({id:curriculumSlugSchema,title:z.string().min(1),description:z.string().min(1),outcomes:z.array(outcomeSchema).min(1)});
const applicationSchema=z.object({conceptId:curriculumSlugSchema,itemId:itemIdSchema,role:z.enum(['foundation','application','diagnostic','operation'])});
const relationSchema=z.object({from:curriculumSlugSchema,to:curriculumSlugSchema,type:z.enum(['requires','related','deepens']),status:z.enum(['proposed','reviewed']),rationale:z.string().min(1)});
export const learningOverlaySchema=z.object({version:z.literal(1),concepts:z.array(conceptSchema).min(1),applications:z.array(applicationSchema),relations:z.array(relationSchema)});
export type Concept=z.infer<typeof conceptSchema>;
export type LevelOutcome=z.infer<typeof outcomeSchema>;
export type AssessmentCriterion=z.infer<typeof criterionSchema>;
export type ItemAssessment={task:string;status:LevelOutcome['status'];level:LearningLevel;criteria:AssessmentCriterion[]};
export type ConceptRelation=z.infer<typeof relationSchema>;
export type ConceptApplication={itemId:string;title:string;trackTitle:string;role:z.infer<typeof applicationSchema>['role']};
export type LearningGraph={concepts:Concept[];conceptsById:Map<string,Concept>;applications:z.infer<typeof applicationSchema>[];relations:ConceptRelation[];curriculum:CurriculumGraph};
export type FocusedConcept={level:LearningLevel;concept:Concept;outcome?:LevelOutcome;nextOutcome?:LevelOutcome;neighbors:Array<{concept:Concept;relation:ConceptRelation;direction:'in'|'out'}>;applications:ConceptApplication[]};
function unique(keys:string[],label:string){if(new Set(keys).size!==keys.length)throw new Error('Duplicate '+label);}
export function resolveLearningLevel(value:string|null):LearningLevel{return LEARNING_LEVELS.find(level=>level===value)??'G1';}
export function conceptsAtLevel(graph:LearningGraph,level:LearningLevel):Concept[]{return graph.concepts.filter(c=>c.outcomes.some(o=>o.level===level));}
/** The overlay is a separately reviewed, immutable layer above canonical workbook data. */
export function buildLearningGraph(input:unknown,curriculum:CurriculumGraph):LearningGraph{
  const data=learningOverlaySchema.parse(input),conceptsById=new Map(data.concepts.map(c=>[c.id,c]));
  unique(data.concepts.map(c=>c.id),'concept ID');
  unique(data.applications.map(a=>a.conceptId+'/'+a.itemId),'application');
  unique(data.relations.map(r=>r.from+'/'+r.to+'/'+r.type),'relation');
  const appIds=new Map<string,Set<string>>();
  for(const app of data.applications){
    if(!conceptsById.has(app.conceptId))throw new Error('Unknown concept: '+app.conceptId);
    const unit=curriculum.itemsById.get(app.itemId);
    if(!unit||unit.kind!=='unit')throw new Error('Unknown learning unit: '+app.itemId);
    const ids=appIds.get(app.conceptId)??new Set<string>();ids.add(app.itemId);appIds.set(app.conceptId,ids);
  }
  for(const c of data.concepts){
    unique(c.outcomes.map(o=>o.level),'level outcome for '+c.id);
    for(const o of c.outcomes){
      unique(o.itemIds,'outcome item for '+c.id+'/'+o.level);
      for(const id of o.itemIds)if(!appIds.get(c.id)?.has(id))throw new Error('Outcome item is not mapped to concept: '+c.id+'/'+o.level+'/'+id);
      unique(o.assessment.criteria.map(criterion=>criterion.id),'assessment criterion for '+c.id+'/'+o.level);
      for(const criterion of o.assessment.criteria){
        if(!o.itemIds.includes(criterion.itemId))
          throw new Error('Assessment item is not in outcome: '+c.id+'/'+o.level+'/'+criterion.itemId);
      }
    }
  }
  const requires=new Map<string,string[]>();
  for(const r of data.relations){
    if(!conceptsById.has(r.from)||!conceptsById.has(r.to))throw new Error('Unknown relation: '+r.from+' -> '+r.to);
    if(r.from===r.to)throw new Error('Self concept relation: '+r.from);
    if(r.type==='requires'){
      if(r.status!=='reviewed')throw new Error('Hard prerequisite requires review: '+r.from);
      requires.set(r.to,[...(requires.get(r.to)??[]),r.from]);
    }
  }
  const seen=new Set<string>(),active=new Set<string>();
  function visit(id:string):void{
    if(active.has(id))throw new Error('Concept prerequisite cycle: '+id);
    if(seen.has(id))return;
    active.add(id);for(const parent of requires.get(id)??[])visit(parent);
    active.delete(id);seen.add(id);
  }
  for(const c of data.concepts)visit(c.id);
  return {...data,conceptsById,curriculum};
}
export function getFocusedConcept(graph:LearningGraph,requested:string|null,requestedLevel:string|null=null):FocusedConcept{
  const level=resolveLearningLevel(requestedLevel);
  const concept=(requested&&graph.conceptsById.get(requested))||conceptsAtLevel(graph,level)[0]||graph.concepts[0];
  const outcome=concept.outcomes.find(o=>o.level===level);
  const nextOutcome=concept.outcomes.find(o=>LEARNING_LEVELS.indexOf(o.level)>LEARNING_LEVELS.indexOf(level));
  const neighbors=outcome?graph.relations.filter(r=>r.from===concept.id||r.to===concept.id).map(relation=>({
    concept:graph.conceptsById.get(relation.from===concept.id?relation.to:relation.from)!,relation,
    direction:(relation.from===concept.id?'out':'in') as 'out'|'in',
  })).filter(x=>x.concept.outcomes.some(o=>o.level===level)):[];
  const mapped=new Map(graph.applications.filter(a=>a.conceptId===concept.id).map(a=>[a.itemId,a]));
  const applications=(outcome?.itemIds??[]).map(id=>{
    const item=graph.curriculum.itemsById.get(id)!,app=mapped.get(id)!;
    if(item.kind!=='unit')throw new Error('Expected unit: '+id);
    return {itemId:item.id,title:item.title,trackTitle:graph.curriculum.tracksById.get(item.trackId)!.title,role:app.role};
  });
  return {level,concept,outcome,nextOutcome,neighbors,applications};
}
export function conceptsForItem(graph:LearningGraph,itemId:string):Concept[]{
  const ids=new Set(graph.applications.filter(a=>a.itemId===itemId).map(a=>a.conceptId));
  return graph.concepts.filter(c=>ids.has(c.id));
}
export function learningGraphHref(id:string,level?:LearningLevel):string{
  return '/?mode=graph&concept='+encodeURIComponent(id)+(level?'&level='+level:'');
}

/** Rubric context is read-only and scoped to an explicit concept, level and mapped item. */
export function assessmentForItem(
  graph:LearningGraph,conceptId:string,level:LearningLevel,itemId:string,
):ItemAssessment|undefined{
  const outcome=graph.conceptsById.get(conceptId)?.outcomes.find(o=>o.level===level);
  if(!outcome)return;
  const criteria=outcome.assessment.criteria.filter(criterion=>criterion.itemId===itemId);
  if(criteria.length===0)return;
  return {task:outcome.assessment.task,status:outcome.status,level,criteria};
}
