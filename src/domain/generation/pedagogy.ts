import { z } from 'zod';
import type { CurriculumGraph } from '../curriculum-v2/graph';
import { contentCriteriaForItem } from './criteria';

/**
 * An authored instructional layer, separate from the canonical curriculum.
 * A single stable curriculum unit may have several short learning segments.
 * This intentionally does not model learner progress, sessions or scheduling.
 */
const detail = z.string().trim().min(1);
const exampleStepSchema = z.object({
  action: detail,
  reason: detail,
  expectedResult: detail,
});
export const learningSegmentSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  objective: detail,
  whyItMatters: detail,
  mentalModel: detail,
  explanation: detail,
  prerequisiteConceptIds: z.array(detail).default([]),
  workedExample: z.object({
    problem: detail,
    steps: z.array(exampleStepSchema).min(1),
  }),
  guidedPractice: z.object({
    prompt: detail,
    starterCode: detail.optional(),
    hints: z.array(detail).min(2).max(3),
    explanation: detail,
  }),
  independentChallenge: z.object({
    prompt: detail,
    criterionIds: z.array(detail).min(1),
    expectedEvidence: z.array(detail).min(1),
  }),
});
export const pedagogySpecSchema = z.object({
  version: z.literal(2),
  segments: z.array(learningSegmentSchema).min(1),
  projectBridge: z.object({
    checkpointId: detail,
    requirementIds: z.array(detail).min(1),
    contribution: detail,
    verification: z.array(detail).min(1),
  }).optional(),
});
export type PedagogySpec = z.infer<typeof pedagogySpecSchema>;

export function validatePedagogySpec(
  graph: CurriculumGraph,
  unitId: string,
  input: unknown,
): PedagogySpec {
  const spec = pedagogySpecSchema.parse(input);
  const unit = graph.itemsById.get(unitId);
  if (!unit || unit.kind !== 'unit') throw new Error('Pedagogy hanya untuk unit: ' + unitId);
  const ids = spec.segments.map((segment) => segment.id);
  if (new Set(ids).size !== ids.length) throw new Error('Segment ID duplikat: ' + unitId);

  const criterionIds = new Set(contentCriteriaForItem(unit).map((criterion) => criterion.id));
  const covered = new Set<string>();
  for (const segment of spec.segments) {
    const guided = segment.guidedPractice.prompt.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
    const independent = segment.independentChallenge.prompt.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
    if (guided === independent || independent.includes(guided)) {
      throw new Error('Independent challenge harus berbeda dari guided practice: ' + unitId + '/' + segment.id);
    }
    for (const id of segment.independentChallenge.criterionIds) {
      if (!criterionIds.has(id)) throw new Error('Criterion segment tidak dikenal: ' + id);
      covered.add(id);
    }
  }
  for (const id of criterionIds) {
    if (!covered.has(id)) throw new Error('Pedagogy criterion belum tercakup: ' + unitId + '/' + id);
  }

  const linkedProjects = (graph.relationsFrom.get(unitId) ?? [])
    .filter((relation) => relation.type === 'contributes_to')
    .map((relation) => relation.to);
  const bridge = spec.projectBridge;
  if (linkedProjects.length && !bridge) {
    throw new Error('Project bridge wajib untuk unit yang memiliki contributes_to: ' + unitId);
  }
  if (bridge) {
    if (!linkedProjects.includes(bridge.checkpointId)) {
      throw new Error('Project bridge harus menggunakan contributes_to eksplisit: ' + unitId);
    }
    const checkpoint = graph.itemsById.get(bridge.checkpointId);
    if (!checkpoint || checkpoint.kind !== 'checkpoint') {
      throw new Error('Checkpoint tidak ditemukan: ' + bridge.checkpointId);
    }
    const requirements = new Set(checkpoint.requirements.map((requirement) => requirement.id));
    for (const id of bridge.requirementIds) {
      if (!requirements.has(id)) throw new Error('Project requirement tidak dikenal: ' + id);
    }
  }
  return spec;
}
