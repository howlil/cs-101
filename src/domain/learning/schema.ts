import { z } from 'zod';
import { taskIdSchema } from '../curriculum';

const envelope = {
  requestId: z.uuid(),
  revision: z.number().int().nonnegative(),
};
export const sessionFields = z.object({
  taskId: taskIdSchema,
  fingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  kind: z.enum(['progress', 'passed']),
  evidence: z.array(z.object({ criterionId: z.string().min(1), text: z.string().trim().min(1).max(8000) })).max(100),
  continueFrom: z.string().trim().max(4000).default(''),
  lastAnchor: z.string().regex(/^[a-zA-Z0-9_-]*$/).max(200).default(''),
  minutes: z.number().int().min(0).max(1440).optional(),
});
export const sessionSchema = sessionFields.extend(envelope);
export const activeTaskSchema = z.object({
  ...envelope,
  taskId: taskIdSchema,
  previousSession: sessionFields.optional(),
});
export type SessionInput = z.infer<typeof sessionSchema>;
export type SessionFields = z.infer<typeof sessionFields>;
