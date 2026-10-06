import { createHash } from 'node:crypto';
import { z } from 'zod';

export const taskIdSchema = z.string().regex(/^[A-Z]+-(?:P)?\d{3}$/);
const criterion = z.object({ id: z.string().min(1), text: z.string().min(1) });
export const taskSchema = z.object({
  taskId: taskIdSchema,
  title: z.string().min(1),
  track: z.string().min(1),
  phase: z.number().int().positive(),
  order: z.number().int().nonnegative(),
  prerequisites: z.array(taskIdSchema),
  criteria: z.array(criterion).min(1),
  challenge: z.string().min(1),
  projectRequirements: z.array(criterion),
});
export type Task = z.infer<typeof taskSchema>;
export const manifestSchema = z.object({ version: z.literal(1), tasks: z.array(taskSchema) });

export function parseManifest(input: unknown) {
  const manifest = manifestSchema.parse(input);
  const tasks = new Map(manifest.tasks.map((task) => [task.taskId, task]));
  if (tasks.size !== manifest.tasks.length) throw new Error('Task ID duplikat.');
  const visited = new Set<string>();
  const visiting = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) throw new Error(`Siklus prerequisite: ${id}`);
    if (visited.has(id)) return;
    const task = tasks.get(id);
    if (!task) throw new Error(`Prerequisite tidak ditemukan: ${id}`);
    const ids = [...task.criteria, ...task.projectRequirements].map((item) => item.id);
    if (new Set(ids).size !== ids.length || ids.includes('challenge')) {
      throw new Error(`Criterion ID duplikat atau reserved: ${id}`);
    }
    visiting.add(id);
    task.prerequisites.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  }
  manifest.tasks.forEach((task) => visit(task.taskId));
  return manifest;
}

export function fingerprint(task: Task) {
  return `sha256:${createHash('sha256').update(JSON.stringify(taskSchema.parse(task))).digest('hex')}`;
}

export function requiredEvidence(task: Task) {
  return [...task.criteria, { id: 'challenge', text: task.challenge }, ...task.projectRequirements];
}
