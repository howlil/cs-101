import { z } from 'zod';
import { itemIdSchema, sourceRefSchema, criterionSchema } from '../curriculum-v2/schema';
import { reviewQuestionSchema } from '../review/schema';

export const contextItemSchema = z.object({
  id: itemIdSchema,
  kind: z.enum(['unit', 'checkpoint', 'integration']),
  title: z.string().min(1),
  fingerprint: z.string().regex(/^sha256:[0-9a-f]{64}$/),
});

export const generationContextSchema = z.object({
  version: z.literal(1),
  target: contextItemSchema,
  location: z.object({
    trackId: z.string().optional(),
    trackTitle: z.string().optional(),
    moduleId: z.string().optional(),
    moduleTitle: z.string().optional(),
  }),
  scope: z.array(z.string().min(1)),
  criteria: z.array(criterionSchema),
  challenge: z.object({
    title: z.string().min(1),
    steps: z.array(z.string().min(1)),
    raw: z.string().min(1),
  }).optional(),
  problemStatement: z.string().optional(),
  requirements: z.array(criterionSchema),
  prerequisites: z.array(contextItemSchema),
  moduleContext: z.array(contextItemSchema),
  nearestCheckpoint: contextItemSchema.optional(),
  projectLineage: z.array(contextItemSchema),
  connections: z.object({
    related: z.array(contextItemSchema),
    deepDive: z.array(contextItemSchema),
    foundation: z.array(contextItemSchema),
    contributesTo: z.array(contextItemSchema),
  }),
  curriculumSource: sourceRefSchema,
  generatedFrom: z.object({
    manifestVersion: z.literal(2),
    itemFingerprint: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  }),
});

export const sourcePackEntrySchema = z.object({
  title: z.string().min(1),
  url: z.url().refine((url) => /^https?:/.test(url)),
  tier: z.number().int().min(0).max(3),
  supports: z.array(z.string().min(1)).min(1),
  notes: z.array(z.string().min(1)).default([]),
  version: z.string().min(1).optional(),
});

export const sourcePackSchema = z.object({
  itemId: itemIdSchema,
  curriculumFingerprint: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  sources: z.array(sourcePackEntrySchema).min(1).max(5),
  unsupportedClaims: z.array(z.string().min(1)).default([]),
});

export const coverageEntrySchema = z.object({
  criterionId: z.string().min(1),
  taughtAt: z.string().min(1),
  assessedAt: z.string().min(1),
  evidenceExpected: z.string().min(1),
});

export const lessonSpecSchema = z.object({
  itemId: itemIdSchema,
  curriculumFingerprint: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  payoff: z.string().min(1),
  learningOutcomes: z.array(z.string().min(1)).min(1).max(8),
  mentalModel: z.string().min(1),
  relationshipGraph: z.string().min(1),
  concepts: z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    mechanism: z.string().min(1),
    sourceUrls: z.array(z.url()).min(1),
  })).min(1),
  misconceptions: z.array(z.string().min(1)).default([]),
  practice: z.array(z.string().min(1)).min(1),
  coverage: z.array(coverageEntrySchema).min(1),
  reviewQuestions: z.array(reviewQuestionSchema).length(5),
});

export const generationRecordSchema = z.object({
  itemId: itemIdSchema,
  fingerprint: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  sources: z.array(z.object({
    title: z.string().min(1),
    url: z.url().refine((url) => /^https?:/.test(url)),
  })).min(1),
  coverage: z.array(coverageEntrySchema).min(1),
  validator: z.object({
    passed: z.literal(true),
    issues: z.array(z.string()).default([]),
  }),
});

export type GenerationContext = z.infer<typeof generationContextSchema>;
export type SourcePack = z.infer<typeof sourcePackSchema>;
export type LessonSpec = z.infer<typeof lessonSpecSchema>;
