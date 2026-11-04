import { z } from 'zod';
import { curriculumSlugSchema, itemIdSchema } from './curriculum-v2/schema';
import type { CurriculumGraph } from './curriculum-v2/graph';

const conceptSchema = z.object({
  id: curriculumSlugSchema,
  title: z.string().min(1),
  level: z.enum(['G0', 'G1', 'G2', 'G3', 'G4']),
  description: z.string().min(1),
  objective: z.string().min(1),
});
const applicationSchema = z.object({
  conceptId: curriculumSlugSchema,
  itemId: itemIdSchema,
  role: z.enum(['foundation', 'application', 'diagnostic', 'operation']),
});
const relationSchema = z.object({
  from: curriculumSlugSchema,
  to: curriculumSlugSchema,
  type: z.enum(['requires', 'related', 'deepens']),
  status: z.enum(['proposed', 'reviewed']),
  rationale: z.string().min(1),
});
export const learningOverlaySchema = z.object({
  version: z.literal(1),
  concepts: z.array(conceptSchema).min(1),
  applications: z.array(applicationSchema),
  relations: z.array(relationSchema),
});
export type Concept = z.infer<typeof conceptSchema>;
export type ConceptRelation = z.infer<typeof relationSchema>;
export type ConceptApplication = { itemId: string; title: string; trackTitle: string; role: z.infer<typeof applicationSchema>['role'] };
export type LearningGraph = {
  concepts: Concept[];
  conceptsById: Map<string, Concept>;
  applications: z.infer<typeof applicationSchema>[];
  relations: ConceptRelation[];
  curriculum: CurriculumGraph;
};
export type FocusedConcept = {
  concept: Concept;
  neighbors: Array<{ concept: Concept; relation: ConceptRelation; direction: 'in' | 'out' }>;
  applications: ConceptApplication[];
};

function assertUnique(keys: string[], label: string) {
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate ' + label);
}

/** The overlay never modifies canonical curriculum items or imports. */
export function buildLearningGraph(input: unknown, curriculum: CurriculumGraph): LearningGraph {
  const parsed = learningOverlaySchema.parse(input);
  const conceptsById = new Map(parsed.concepts.map((concept) => [concept.id, concept]));
  assertUnique(parsed.concepts.map((concept) => concept.id), 'concept ID');
  assertUnique(parsed.applications.map((app) => app.conceptId + '/' + app.itemId), 'application');
  assertUnique(parsed.relations.map((r) => r.from + '/' + r.to + '/' + r.type), 'relation');
  for (const app of parsed.applications) {
    if (!conceptsById.has(app.conceptId)) throw new Error('Unknown concept: ' + app.conceptId);
    const unit = curriculum.itemsById.get(app.itemId);
    if (!unit || unit.kind !== 'unit') throw new Error('Unknown learning unit: ' + app.itemId);
  }
  const requires = new Map<string, string[]>();
  for (const r of parsed.relations) {
    if (!conceptsById.has(r.from) || !conceptsById.has(r.to)) throw new Error('Unknown relation: ' + r.from + ' -> ' + r.to);
    if (r.from === r.to) throw new Error('Self concept relation: ' + r.from);
    if (r.type !== 'requires') continue;
    if (r.status !== 'reviewed') throw new Error('Hard prerequisite requires review: ' + r.from);
    requires.set(r.to, [...(requires.get(r.to) ?? []), r.from]);
  }
  const visited = new Set<string>(), visiting = new Set<string>();
  function visit(id: string): void {
    if (visiting.has(id)) throw new Error('Concept prerequisite cycle: ' + id);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const parent of requires.get(id) ?? []) visit(parent);
    visiting.delete(id);
    visited.add(id);
  }
  for (const c of parsed.concepts) visit(c.id);
  return { ...parsed, conceptsById, curriculum };
}

export function getFocusedConcept(graph: LearningGraph, requested: string | null): FocusedConcept {
  const concept = (requested && graph.conceptsById.get(requested)) || graph.concepts[0];
  const neighbors = graph.relations.filter((r) => r.from === concept.id || r.to === concept.id)
    .map((relation) => ({
      concept: graph.conceptsById.get(relation.from === concept.id ? relation.to : relation.from)!,
      relation,
      direction: (relation.from === concept.id ? 'out' : 'in') as 'in' | 'out',
    }));
  const applications = graph.applications.filter((a) => a.conceptId === concept.id).map((a) => {
    const unit = graph.curriculum.itemsById.get(a.itemId)!;
    if (unit.kind !== 'unit') throw new Error('Expected unit: ' + a.itemId);
    return {
      itemId: unit.id, title: unit.title,
      trackTitle: graph.curriculum.tracksById.get(unit.trackId)!.title, role: a.role,
    };
  });
  return { concept, neighbors, applications };
}

export function conceptsForItem(graph: LearningGraph, itemId: string): Concept[] {
  const ids = new Set(graph.applications.filter((a) => a.itemId === itemId).map((a) => a.conceptId));
  return graph.concepts.filter((c) => ids.has(c.id));
}

export function learningGraphHref(conceptId: string): string {
  return '/?mode=graph&concept=' + encodeURIComponent(conceptId);
}
