import type { LibraryView } from './content-library';
import { libraryViewHref } from './content-library';
import type { Concept, LearningGraph, LearningLevel, FocusedConcept, ConceptApplication } from './learning-graph';
import { getFocusedConcept, LEARNING_LEVELS } from './learning-graph';

export type PathStep = ConceptApplication & {
  conceptId: string;
  conceptTitle: string;
  reviewedPrerequisite: boolean;
};

export type LearningPath = {
  conceptId: string;
  level: LearningLevel;
  steps: PathStep[];
  missingPrerequisites: Array<{ id: string; title: string; availableLevels: LearningLevel[] }>;
  reviewedPrerequisiteCount: number;
};

export type ItemPathContext = {
  conceptId: string;
  conceptTitle: string;
  level: LearningLevel;
  index: number;
  total: number;
  previous?: PathStep;
  next?: PathStep;
};

/**
 * Traverse only explicit, reviewed 'requires' edges in dependency-first order.
 * Related and deepens links never become learning gates. Within each concept,
 * itemIds preserve the editor's suggested sequence, not a hard prerequisite.
 */
export function getLearningPath(graph: LearningGraph, focus: FocusedConcept): LearningPath {
  const steps: PathStep[] = [];
  const missingPrerequisites: LearningPath['missingPrerequisites'] = [];
  if (!focus.outcome) return {
    conceptId: focus.concept.id, level: focus.level, steps, missingPrerequisites,
    reviewedPrerequisiteCount: 0,
  };

  const visited = new Set<string>();
  const ordered: Concept[] = [];
  let reviewedPrerequisiteCount = 0;

  function visit(concept: Concept): void {
    if (visited.has(concept.id)) return;
    visited.add(concept.id);
    const prerequisites = graph.relations.filter((relation) =>
      relation.type === 'requires' && relation.status === 'reviewed' && relation.to === concept.id);
    reviewedPrerequisiteCount += prerequisites.length;
    for (const prerequisite of prerequisites) visit(graph.conceptsById.get(prerequisite.from)!);
    const outcome = concept.outcomes.find((candidate) => candidate.level === focus.level);
    if (outcome) ordered.push(concept);
    else missingPrerequisites.push({
      id: concept.id, title: concept.title,
      availableLevels: concept.outcomes.map((entry) => entry.level),
    });
  }

  visit(focus.concept);
  const emitted = new Set<string>();
  for (const concept of ordered) {
    const outcome = concept.outcomes.find((entry) => entry.level === focus.level)!;
    for (const itemId of outcome.itemIds) {
      if (emitted.has(itemId)) continue;
      emitted.add(itemId);
      const item = graph.curriculum.itemsById.get(itemId)!;
      const mapped = graph.applications.find((app) => app.conceptId === concept.id && app.itemId === itemId)!;
      if (item.kind !== 'unit') throw new Error('Expected unit in learning path: ' + itemId);
      steps.push({
        itemId, title: item.title, role: mapped.role,
        trackTitle: graph.curriculum.tracksById.get(item.trackId)!.title,
        conceptId: concept.id, conceptTitle: concept.title,
        reviewedPrerequisite: concept.id !== focus.concept.id,
      });
    }
  }
  return { conceptId: focus.concept.id, level: focus.level, steps, missingPrerequisites, reviewedPrerequisiteCount };
}

export function pathItemHref(
  itemId: string, conceptId: string, level: LearningLevel, view: LibraryView = 'materi',
): string {
  return libraryViewHref(itemId, view)
    + '&concept=' + encodeURIComponent(conceptId)
    + '&level=' + level;
}

/** URL context is opt-in and accepted only for a unit in this concept-depth path. */
export function getItemPathContext(
  graph: LearningGraph, requestedConcept: string | null,
  requestedLevel: string | null, itemId: string,
): ItemPathContext | undefined {
  if (!requestedConcept || !LEARNING_LEVELS.some((level) => level === requestedLevel)) return;
  const concept = graph.conceptsById.get(requestedConcept);
  if (!concept) return;
  const level = requestedLevel as LearningLevel;
  const focus = getFocusedConcept(graph, concept.id, level);
  if (!focus.outcome) return;
  const steps = getLearningPath(graph, focus).steps;
  const at = steps.findIndex((step) => step.itemId === itemId);
  if (at < 0) return;
  return {
    conceptId: concept.id, conceptTitle: concept.title, level,
    index: at + 1, total: steps.length,
    previous: at > 0 ? steps[at - 1] : undefined,
    next: steps[at + 1],
  };
}
