import { z } from 'zod';

export const executableExampleSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  runtime: z.enum(['node', 'java']),
  file: z.string().regex(/^[A-Za-z][A-Za-z0-9_-]*\.(mjs|java)$/),
  expectedStdout: z.string(),
}).superRefine((example, ctx) => {
  const extension = example.runtime === 'node' ? '.mjs' : '.java';
  if (!example.file.endsWith(extension)) {
    ctx.addIssue({ code: 'custom', path: ['file'], message: 'Runtime tidak cocok dengan ekstensi fixture.' });
  }
});

export const executablePlanSchema = z.object({
  version: z.literal(1),
  itemId: z.string().regex(/^[A-Z]+-(?:P\d{2,3}|\d{3})$/),
  curriculumFingerprint: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  examples: z.array(executableExampleSchema).max(12),
  noExecutableReason: z.string().trim().min(20).optional(),
}).superRefine((plan, ctx) => {
  if (!plan.examples.length && !plan.noExecutableReason) {
    ctx.addIssue({ code:'custom', path:['noExecutableReason'], message:'Tidak ada executable examples: berikan justifikasi review eksplisit.' });
  }
  if (new Set(plan.examples.map(e=>e.id)).size !== plan.examples.length) {
    ctx.addIssue({ code:'custom', path:['examples'], message:'Executable example ID duplikat.' });
  }
  if (new Set(plan.examples.map(e=>e.file)).size !== plan.examples.length) {
    ctx.addIssue({ code:'custom', path:['examples'], message:'Fixture file duplikat.' });
  }
});
export type ExecutablePlan = z.infer<typeof executablePlanSchema>;
