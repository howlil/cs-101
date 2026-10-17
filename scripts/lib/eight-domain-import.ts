import { z } from 'zod';
import {
  curriculumItemFingerprint, parseManifestV2,
  type CurriculumManifestV2, type LearningUnit,
} from '../../src/domain/curriculum-v2/schema';

const text = z.string().trim().min(1);
export const eightDomainSnapshotSchema = z.object({
  version: z.literal(1),
  source: z.object({
    name: text,
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  sheets: z.array(z.object({
    name: text,
    entries: z.array(z.object({
      row: z.number().int().positive(),
      module: text,
      topics: text,
      task: text,
      sourceUrl: z.url().refine((u) => /^https:/.test(u)),
    })),
  })).length(8),
});

export const EIGHT_DOMAIN_TRACKS = [
  { sheet:'Java', id:'java', title:'Java Engineering', prefix:'JAV' },
  { sheet:'Spring Boot', id:'spring-boot', title:'Spring Boot Engineering', prefix:'SPR' },
  { sheet:'Database', id:'database', title:'Database & SQL Engineering', prefix:'SQL' },
  { sheet:'OS & Linux', id:'os-linux', title:'OS & Linux Engineering', prefix:'OSX' },
  { sheet:'Networking', id:'networking', title:'Networking Engineering', prefix:'NET' },
  { sheet:'Software Testing', id:'software-testing', title:'Software Testing Engineering', prefix:'TST' },
  { sheet:'System Design', id:'system-design', title:'System Design Engineering', prefix:'SYS' },
  { sheet:'Production Engineering', id:'production-engineering', title:'Production Engineering', prefix:'PRD' },
] as const;

const normalize = (value: string) => value.normalize('NFKD')
  .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const bullets = (raw: string) => raw.split(/\r?\n/)
  .map((line) => line.trim().replace(/^[•-]\s*/, '')).filter(Boolean);
const priority = (task: string) => {
  const match = /^P([012])\s*[·:-]\s*/.exec(task);
  if (!match) throw new Error('Workbook task needs explicit P0/P1/P2 priority: ' + task);
  return ('P' + match[1]) as 'P0'|'P1'|'P2';
};
export type EightDomainImportReport = {
  version:1; sourceSha256:string;
  counts:{tracks:number;modules:number;units:number;checkpoints:number;integrations:number;relations:number;priorities:Record<'P0'|'P1'|'P2',number>};
  warnings:string[];
  policy:string;
};

/** Preserve source order and exact source text. No fake prerequisites or checkpoint relations. */
export function importEightDomainSnapshot(input:unknown):{manifest:CurriculumManifestV2;report:EightDomainImportReport} {
  const snapshot=eightDomainSnapshotSchema.parse(input);
  const given=new Map(snapshot.sheets.map((sheet)=>[sheet.name,sheet]));
  const tracks:CurriculumManifestV2['tracks']=[];
  const modules:CurriculumManifestV2['modules']=[];
  const items:LearningUnit[]=[];
  const priorities:{P0:number;P1:number;P2:number}={P0:0,P1:0,P2:0};
  const warnings:string[]=[];
  for(const [position,spec] of EIGHT_DOMAIN_TRACKS.entries()){
    const sheet=given.get(spec.sheet);
    if(!sheet)throw new Error('Expected workbook sheet missing: '+spec.sheet);
    tracks.push({id:spec.id,title:spec.title,order:position+1});
    let previousModule='',moduleId='',moduleOrder=0;
    const rows=new Set<number>();
    for(const [index,entry] of sheet.entries.entries()){
      if(rows.has(entry.row))throw new Error('Duplicate source row '+spec.sheet+'/'+entry.row);
      rows.add(entry.row);
      const header=entry.module.split(/\r?\n/)[0].trim();
      if(header!==previousModule){
        previousModule=header;
        moduleOrder++;
        const parsed=/^(\d{2})\s*[·.-]\s*(.+)$/.exec(header);
        const title=parsed?.[2]?.trim() ?? header;
        const section=parsed?.[1] ?? String(moduleOrder).padStart(2,'0');
        moduleId=spec.id+'-'+section+'-'+normalize(title);
        modules.push({id:moduleId,trackId:spec.id,title,order:moduleOrder,sourceLabel:header});
      }
      const rank=priority(entry.task);priorities[rank]++;
      const rawTask=entry.task.replace(/^P[012]\s*[·:-]\s*/, '').trim();
      const colon=rawTask.indexOf(':');
      const name=colon>0?rawTask.slice(0,colon).trim():bullets(entry.topics)[0];
      const objective=colon>0?rawTask.slice(colon+1).trim():rawTask;
      const step=objective||rawTask;
      if(colon<0)warnings.push('Task without colon used source topic as title: '+spec.prefix+'-'+String(index+1).padStart(3,'0'));
      const id=spec.prefix+'-'+String(index+1).padStart(3,'0');
      const payload={
        id,kind:'unit' as const,trackId:spec.id,moduleId,order:index+1,
        title:name,
        scope:bullets(entry.topics),
        criteria:[{id:'source-task',text:step}],
        challenge:{title:name,steps:[step],raw:entry.task},
        prerequisites:[],
        marketExpectation:[rank+' — workbook priority'],
        source:{title:spec.title+' · official source (workbook row '+entry.row+')',url:entry.sourceUrl},
        crossModuleReferenceRaw:[],
      };
      items.push({...payload,fingerprint:curriculumItemFingerprint(payload)});
    }
  }
  const manifest=parseManifestV2({version:2,tracks,modules,items,relations:[]});
  return {manifest,report:{
    version:1,sourceSha256:snapshot.source.sha256,
    counts:{
      tracks:tracks.length,modules:modules.length,units:items.length,
      checkpoints:0,integrations:0,relations:0,priorities,
    },
    warnings,
    policy:'An imported item is an outline, never a published MDX lesson. Workbook has no verified prerequisite graph or standalone checkpoints: do not fabricate them.',
  }};
}
