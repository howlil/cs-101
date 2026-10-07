import { z } from 'zod';
import { itemIdSchema } from '../curriculum-v2/schema';

const envelope = {
  requestId: z.uuid(),
  revision: z.number().int().nonnegative(),
};

export const sessionReflectionSchema = z.object({
  wrongAssumption: z.string().trim().max(4000).default(''),
  evidenceChangedMind: z.string().trim().max(4000).default(''),
  tradeoffChosen: z.string().trim().max(4000).default(''),
  explainWithoutNotes: z.string().trim().max(4000).default(''),
  monitorInProduction: z.string().trim().max(4000).default(''),
});

const canonicalSessionFields = z.object({
  itemId: itemIdSchema,
  fingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  kind: z.enum(['progress', 'passed']),
  evidence: z.array(z.object({
    criterionId: z.string().min(1),
    text: z.string().trim().min(1).max(8000),
  })).max(100),
  continueFrom: z.string().trim().max(4000).default(''),
  lastAnchor: z.string().regex(/^[a-zA-Z0-9_-]*$/).max(200).default(''),
  minutes: z.number().int().min(0).max(1440).optional(),
  reflection: sessionReflectionSchema.optional(),
});

function withLegacyItemId(value: unknown) {
  if (!value || typeof value !== 'object') return value;
  const input = value as Record<string, unknown>;
  return {
    ...input,
    itemId: input.itemId ?? input.taskId,
  };
}

export const sessionFields = z.preprocess(withLegacyItemId, canonicalSessionFields);
export const sessionSchema = z.preprocess(
  withLegacyItemId,
  canonicalSessionFields.extend(envelope),
);

export const activeItemSchema = z.preprocess(
  withLegacyItemId,
  z.object({
    ...envelope,
    itemId: itemIdSchema,
    previousSession: sessionFields.optional(),
  }),
);

// Compatibility name while old clients/routes are being retired.
export const activeTaskSchema = activeItemSchema;

export type SessionReflection = z.infer<typeof sessionReflectionSchema>;
export type SessionInput = z.infer<typeof sessionSchema>;
export type SessionFields = z.infer<typeof sessionFields>;
export type ActiveItemInput = z.infer<typeof activeItemSchema>;

export { reviewAttemptSchema, type ReviewAttemptInput } from '../review/schema';
