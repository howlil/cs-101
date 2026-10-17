import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import type { SourcePack } from './schema';

export const sha256 = (value: string | Buffer) =>
  createHash('sha256').update(value).digest('hex');

export const sourceClaimSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  statement: z.string().trim().min(16),
  conceptIds: z.array(z.string().min(1)).min(1),
  sourceUrl: z.url(),
  locator: z.string().trim().min(3),
  rationale: z.string().trim().min(12),
});

/** A traceable, author-reviewed claim ledger, NOT a network fact-checker. */
export function verifySourceClaims(
  pack: SourcePack,
  concepts: { id: string }[],
  requireLedger: boolean,
) {
  const claims = z.array(sourceClaimSchema).parse(pack.claims ?? []);
  if (!requireLedger) return claims;
  if (!claims.length) throw new Error('V3 wajib memiliki source claim ledger.');
  const sourceUrls = new Set(pack.sources.map((s) => s.url));
  const conceptIds = new Set(concepts.map((c) => c.id));
  if (new Set(claims.map((c) => c.id)).size !== claims.length) {
    throw new Error('Claim ID duplikat.');
  }
  const supportedConcepts = new Set<string>();
  for (const claim of claims) {
    if (!sourceUrls.has(claim.sourceUrl)) {
      throw new Error('Claim memakai source URL di luar source pack: ' + claim.id);
    }
    for (const id of claim.conceptIds) {
      if (!conceptIds.has(id)) throw new Error('Claim menggunakan concept tidak dikenal: ' + id);
      supportedConcepts.add(id);
    }
  }
  for (const id of conceptIds) {
    if (!supportedConcepts.has(id)) throw new Error('Concept tanpa source claim terlacak: ' + id);
  }
  return claims;
}

export function assertV3LessonBindings(lesson: string, itemId: string) {
  if (!/^[A-Z]+-(?:P\d{2,3}|\d{3})$/.test(itemId)) throw new Error('Item ID invalid.');
  const pedigree = ['import pedagogyRecord', 'from', "'../../../generation/pedagogy/" + itemId + ".json';"].join(' ');
  const bank = ['import questionBank', 'from', "'../../../review-banks/" + itemId + ".json';"].join(' ');
  const shared = 'export const lessonSegments = pedagogyRecord.pedagogy.segments;';
  for (const [label, literal] of [
    ['V3 pedagogy import', pedigree], ['V3 question bank import', bank],
    ['V3 shared segments', shared], ['V3 bank quiz', '<Quiz bank={questionBank} />'],
  ]) {
    if (!lesson.includes(literal)) throw new Error('MDX kehilangan ' + label + ' dari artifact canonical.');
    if (lesson.split(literal).length !== 2) throw new Error('MDX duplikat: ' + label);
  }
  for (const stage of ['understand', 'practice', 'evidence']) {
    const binding = '<LearningSegments stage="' + stage + '" segments={lessonSegments} />';
    if (!lesson.includes(binding)) throw new Error('V3 lesson tidak memakai shared segment renderer pada stage: ' + stage);
    if (lesson.split(binding).length !== 2) throw new Error('V3 stage di-render lebih dari sekali: ' + stage);
  }
  if (/<Quiz\s+items=/.test(lesson)) throw new Error('V3 quiz tidak boleh memakai soal inline.');
  if (/export const lessonSegments\s*=\s*\[/.test(lesson)) throw new Error('V3 segments tidak boleh disalin inline.');
}

/** Release receipt binds exactly the files that the production MDX imports. */
export const verifiedLessonSchema = z.object({
  version: z.literal(3),
  itemId: z.string().min(1),
  curriculumFingerprint: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  hashes: z.object({
    lesson: z.string().length(64),
    pedagogy: z.string().length(64),
    questionBank: z.string().length(64),
    sourcePack: z.string().length(64),
    exampleProof: z.string().length(64),
    examplePlan: z.string().length(64),
  }),
});

export function checkPublishedV3Files(root: string, itemId: string, fingerprint: string) {
  const read = (path: string) => readFileSync(root + '/' + path, 'utf8');
  const receipt = verifiedLessonSchema.parse(JSON.parse(read('generation/verified/' + itemId + '.json')));
  if (receipt.itemId !== itemId || receipt.curriculumFingerprint !== fingerprint) {
    throw new Error('V3 published receipt stale: ' + itemId);
  }
  const files = {
    lesson: 'src/content/lessons/' + itemId + '.mdx',
    pedagogy: 'generation/pedagogy/' + itemId + '.json',
    questionBank: 'review-banks/' + itemId + '.json',
    sourcePack: 'generation/sources/' + itemId + '.json',
    exampleProof: 'generation/proofs/' + itemId + '.json',
    examplePlan: 'generation/executables/' + itemId + '.json',
  } as const;
  for (const [kind, path] of Object.entries(files) as [keyof typeof files, string][]) {
    if (sha256(read(path)) !== receipt.hashes[kind]) {
      throw new Error('Published artifact drift: ' + basename(path));
    }
  }
  const lesson = read(files.lesson);
  assertV3LessonBindings(lesson, itemId);
  const pedagogy = JSON.parse(read(files.pedagogy));
  const questionBank = JSON.parse(read(files.questionBank));
  if (pedagogy.unitId !== itemId || pedagogy.curriculumFingerprint !== fingerprint ||
      pedagogy.pedagogy?.version !== 3) throw new Error('Published pedagogy identity mismatch.');
  if (questionBank.itemId !== itemId || questionBank.curriculumFingerprint !== fingerprint) {
    throw new Error('Published quiz identity mismatch.');
  }
  return {receipt, pedagogy, questionBank};
}
