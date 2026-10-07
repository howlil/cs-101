import { createHash } from 'node:crypto';
import { z } from 'zod';

export const itemIdSchema=z.string().regex(/^[A-Z]+-(?:P\d{2,3}|\d{3})$/);
export const curriculumSlugSchema=z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const criterionSchema=z.object({id:z.string().min(1),text:z.string().min(1)});
export const challengeSchema=z.object({title:z.string().min(1),steps:z.array(z.string().min(1)),raw:z.string().min(1)});
export const sourceRefSchema=z.object({title:z.string().min(1),url:z.url().refine((url)=>/^https?:/.test(url)).optional()});
export const trackSchema=z.object({id:curriculumSlugSchema,title:z.string().min(1),order:z.number().int().positive()});
export const moduleSchema=z.object({id:curriculumSlugSchema,trackId:curriculumSlugSchema,title:z.string().min(1),sourceLabel:z.string().min(1).optional(),order:z.number().int().positive()});
const baseItem=z.object({id:itemIdSchema,order:z.number().int().positive(),title:z.string().min(1),prerequisites:z.array(itemIdSchema),fingerprint:z.string().regex(/^sha256:[0-9a-f]{64}$/)});
export const learningUnitSchema=baseItem.extend({kind:z.literal('unit'),trackId:curriculumSlugSchema,moduleId:curriculumSlugSchema,scope:z.array(z.string().min(1)).min(1),criteria:z.array(criterionSchema).min(1),challenge:challengeSchema,marketExpectation:z.array(z.string().min(1)),reflectionPrompts:z.array(z.string().min(1)).optional(),source:sourceRefSchema,estimatedMinutes:z.number().int().positive().optional(),crossModuleReferenceRaw:z.array(z.string().min(1))});
export const projectCheckpointSchema=baseItem.extend({kind:z.literal('checkpoint'),trackId:curriculumSlugSchema,moduleId:curriculumSlugSchema,problemStatement:z.string().min(1),requirements:z.array(criterionSchema).min(1),parentProjectId:itemIdSchema.optional(),source:sourceRefSchema,estimatedMinutes:z.number().int().positive().optional()});
export const integrationExerciseSchema=baseItem.extend({kind:z.literal('integration'),brief:z.string().min(1),scope:z.array(z.string().min(1)).min(1),challenge:challengeSchema,criteria:z.array(criterionSchema).min(1),requirements:z.array(criterionSchema),source:sourceRefSchema,estimatedMinutes:z.number().int().positive().optional()});
export const curriculumItemSchema=z.discriminatedUnion('kind',[learningUnitSchema,projectCheckpointSchema,integrationExerciseSchema]);
export const relationTypeSchema=z.enum(['prerequisite','foundation','related','deep_dive','contributes_to','project_parent']);
export const relationSchema=z.object({from:itemIdSchema,to:itemIdSchema,type:relationTypeSchema});
export const manifestV2Schema=z.object({version:z.literal(2),tracks:z.array(trackSchema),modules:z.array(moduleSchema),items:z.array(curriculumItemSchema),relations:z.array(relationSchema)});

export type Track=z.infer<typeof trackSchema>;
export type CurriculumModule=z.infer<typeof moduleSchema>;
export type Criterion=z.infer<typeof criterionSchema>;
export type CurriculumItem=z.infer<typeof curriculumItemSchema>;
export type LearningUnit=z.infer<typeof learningUnitSchema>;
export type ProjectCheckpoint=z.infer<typeof projectCheckpointSchema>;
export type IntegrationExercise=z.infer<typeof integrationExerciseSchema>;
export type Relation=z.infer<typeof relationSchema>;
export type CurriculumManifestV2=z.infer<typeof manifestV2Schema>;

function assertUnique(values:string[],label:string){if(new Set(values).size!==values.length)throw new Error(label+' duplikat.');}
function assertAcyclic(items:Map<string,CurriculumItem>,edges:(item:CurriculumItem)=>string[],label:string){
  const visited=new Set<string>(),visiting=new Set<string>();
  function visit(id:string){if(visiting.has(id))throw new Error('Siklus '+label+': '+id);if(visited.has(id))return;const item=items.get(id);if(!item)throw new Error('Item tidak ditemukan: '+id);visiting.add(id);edges(item).forEach(visit);visiting.delete(id);visited.add(id);}
  items.forEach((_item,id)=>visit(id));
}
function canonicalJsonValue(value:unknown):unknown{
  if(Array.isArray(value))return value.map(canonicalJsonValue);
  if(value&&typeof value==='object'){
    return Object.fromEntries(
      Object.entries(value as Record<string,unknown>)
        .sort(([a],[b])=>a.localeCompare(b))
        .map(([key,current])=>[key,canonicalJsonValue(current)])
    );
  }
  return value;
}
export function curriculumItemFingerprint(item:object){
  const{fingerprint:_fingerprint,reflectionPrompts:_reflectionPrompts,...payload}=item as Record<string,unknown>;
  return 'sha256:'+createHash('sha256').update(JSON.stringify(canonicalJsonValue(payload))).digest('hex');
}
export function parseManifestV2(input:unknown):CurriculumManifestV2{
  const manifest=manifestV2Schema.parse(input);
  assertUnique(manifest.tracks.map(x=>x.id),'Track ID');assertUnique(manifest.modules.map(x=>x.id),'Module ID');assertUnique(manifest.items.map(x=>x.id),'Item ID');
  const tracks=new Map(manifest.tracks.map(x=>[x.id,x])),modules=new Map(manifest.modules.map(x=>[x.id,x])),items=new Map(manifest.items.map(x=>[x.id,x]));
  for(const module of manifest.modules)if(!tracks.has(module.trackId))throw new Error('Track module tidak ditemukan: '+module.id+'/'+module.trackId);
  for(const item of manifest.items){
    const criterionIds=item.kind==='checkpoint'?item.requirements.map(x=>x.id):item.kind==='integration'?[...item.criteria,...item.requirements].map(x=>x.id):item.criteria.map(x=>x.id);assertUnique(criterionIds,'Criterion '+item.id);
    if(item.kind!=='integration'){const module=modules.get(item.moduleId);if(!tracks.has(item.trackId))throw new Error('Track item tidak ditemukan: '+item.id+'/'+item.trackId);if(!module)throw new Error('Module item tidak ditemukan: '+item.id+'/'+item.moduleId);if(module.trackId!==item.trackId)throw new Error('Track/module tidak konsisten: '+item.id);}
    for(const prerequisite of item.prerequisites){if(!items.has(prerequisite))throw new Error('Prerequisite tidak ditemukan: '+item.id+'/'+prerequisite);if(prerequisite===item.id)throw new Error('Self prerequisite: '+item.id);}
    if(item.kind==='checkpoint'&&item.parentProjectId){const parent=items.get(item.parentProjectId);if(!parent||parent.kind!=='checkpoint')throw new Error('Project parent tidak valid: '+item.id+'/'+item.parentProjectId);if(parent.trackId!==item.trackId)throw new Error('Project lineage lintas track: '+item.id);}
    if(curriculumItemFingerprint(item)!==item.fingerprint)throw new Error('Fingerprint item tidak cocok: '+item.id);
  }
  const relationKeys=manifest.relations.map(r=>r.from+'\0'+r.to+'\0'+r.type);assertUnique(relationKeys,'Relation');
  for(const relation of manifest.relations){if(!items.has(relation.from)||!items.has(relation.to))throw new Error('Relation item tidak ditemukan: '+relation.from+' -> '+relation.to);if(relation.type==='prerequisite'&&!items.get(relation.to)!.prerequisites.includes(relation.from))throw new Error('Relation prerequisite tidak sinkron: '+relation.from+' -> '+relation.to);}
  const prerequisiteRelations=new Set(manifest.relations.filter(r=>r.type==='prerequisite').map(r=>r.from+'\0'+r.to));
  for(const item of manifest.items)for(const prerequisite of item.prerequisites)if(!prerequisiteRelations.has(prerequisite+'\0'+item.id))throw new Error('Relation prerequisite hilang: '+prerequisite+' -> '+item.id);
  assertAcyclic(items,item=>item.prerequisites,'prerequisite');assertAcyclic(items,item=>item.kind==='checkpoint'&&item.parentProjectId?[item.parentProjectId]:[],'project lineage');
  return manifest;
}
