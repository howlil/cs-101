import { z } from 'zod';
import { itemIdSchema } from '../curriculum-v2/schema';

export const reviewQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  answer: z.number().int().nonnegative(),
  explanation: z.string().min(1),
  criterionIds: z.array(z.string().min(1)).default([]),
}).superRefine((question, ctx) => {
  if (question.answer >= question.options.length) {
    ctx.addIssue({
      code: 'custom',
      path: ['answer'],
      message: 'Answer index berada di luar options.',
    });
  }
});

export const reviewBankSchema = z.object({
  itemId: itemIdSchema,
  version: z.string().min(1),
  curriculumFingerprint: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  questions: z.array(reviewQuestionSchema).length(5),
});

export type ReviewBank = z.infer<typeof reviewBankSchema>;