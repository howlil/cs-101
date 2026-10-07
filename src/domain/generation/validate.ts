import type { CurriculumGraph } from '../curriculum-v2/graph';
import { requiredEvidenceForItem } from '../learning/rules';
import {
  generationRecordSchema,
  lessonSpecSchema,
  sourcePackSchema,
  type LessonSpec,
  type SourcePack,
} from './schema';
import { reviewBankSchema, type ReviewBank } from '../review/schema';

export function validateGenerationPlan(
  graph: CurriculumGraph,
  itemId: string,
  sourcePackInput: unknown,
  lessonSpecInput: unknown,
) {
  const item = graph.itemsById.get(itemId);
  if (!item) throw new Error('Item tidak ditemukan: ' + itemId);
  if (item.kind !== 'unit') throw new Error('Lesson generator hanya menerima unit: ' + itemId);

  const sourcePack = sourcePackSchema.parse(sourcePackInput);
  const lessonSpec = lessonSpecSchema.parse(lessonSpecInput);

  if (sourcePack.itemId !== item.id || lessonSpec.itemId !== item.id) {
    throw new Error('Generation artifact menunjuk item yang berbeda.');
  }
  if (
    sourcePack.curriculumFingerprint !== item.fingerprint ||
    lessonSpec.curriculumFingerprint !== item.fingerprint
  ) {
    throw new Error('Generation artifact stale terhadap curriculum.');
  }
  if (sourcePack.unsupportedClaims.length) {
    throw new Error('Source pack masih punya unsupported claim.');
  }

  const sourceUrls = new Set(sourcePack.sources.map((source) => source.url));
  for (const concept of lessonSpec.concepts) {
    for (const url of concept.sourceUrls) {
      if (!sourceUrls.has(url)) {
        throw new Error('Concept memakai source di luar source pack: ' + url);
      }
    }
  }

  const expectedCriteria = requiredEvidenceForItem(item);
  const coverageIds = new Set(lessonSpec.coverage.map((entry) => entry.criterionId));
  for (const criterion of expectedCriteria) {
    if (!coverageIds.has(criterion.id)) {
      throw new Error('Coverage hilang: ' + item.id + '/' + criterion.id);
    }
  }

  const reviewCoverage = new Set(
    lessonSpec.reviewQuestions.flatMap((question) => question.criterionIds),
  );
  for (const criterion of item.criteria) {
    if (!reviewCoverage.has(criterion.id)) {
      throw new Error('Review bank tidak menguji criterion: ' + item.id + '/' + criterion.id);
    }
  }

  return { sourcePack, lessonSpec };
}

export function buildGenerationRecord(
  sourcePack: SourcePack,
  lessonSpec: LessonSpec,
) {
  return generationRecordSchema.parse({
    itemId: lessonSpec.itemId,
    fingerprint: lessonSpec.curriculumFingerprint,
    sources: sourcePack.sources.map(({ title, url }) => ({ title, url })),
    coverage: lessonSpec.coverage,
    validator: { passed: true, issues: [] },
  });
}

export function buildReviewBank(
  lessonSpec: LessonSpec,
): ReviewBank {
  return reviewBankSchema.parse({
    itemId: lessonSpec.itemId,
    version: 'lesson-spec-v1:' + lessonSpec.curriculumFingerprint,
    curriculumFingerprint: lessonSpec.curriculumFingerprint,
    questions: lessonSpec.reviewQuestions,
  });
}
