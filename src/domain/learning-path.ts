import type { LibraryView } from './content-library';
import { libraryViewHref } from './content-library';
import type { Concept, LearningGraph, LearningLevel, FocusedConcept, ConceptApplication } from './learning-graph';
import { getFocusedConcept, LEARNING_LEVELS } from './learning-graph';

export type PathStep = ConceptApplication & {
  conceptId: string;
  conceptTitle: string;
  reviewedPrerequisite: boolean;
  stepLevel: LearningLevel;
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
  const active = new Set<string>();
  const ordered: Array<{concept:Concept;level:LearningLevel}> = [];
  let reviewedPrerequisiteCount = 0;
  const key = (id:string,level:LearningLevel)=>id+'/'+level;

  function visit(concept: Concept, level:LearningLevel): void {
    const id=key(concept.id,level);
    if(visited.has(id))return;
    if(active.has(id))throw new Error('Mixed prerequisite cycle: '+id);
    active.add(id);
    const legacy=graph.relations.filter(r=>
      r.type==='requires' && r.status==='reviewed' && r.to===concept.id);
    for(const relation of legacy){
      reviewedPrerequisiteCount++;
      visit(graph.conceptsById.get(relation.from)!,level);
    }
    const dependencies=graph.competencyDependencies.filter(d=>d.status==='reviewed'
      &&d.to.conceptId===concept.id&&d.to.level===level);
    for(const dependency of dependencies){
      reviewedPrerequisiteCount++;
      visit(graph.conceptsById.get(dependency.from.conceptId)!,dependency.from.level);
    }
    const outcome=concept.outcomes.find(candidate=>candidate.level===level);
    if(outcome)ordered.push({concept,level});
    else if(!missingPrerequisites.some(m=>m.id===concept.id))missingPrerequisites.push({
      id:concept.id,title:concept.title,availableLevels:concept.outcomes.map(entry=>entry.level),
    });
    active.delete(id);visited.add(id);
  }

  visit(focus.concept,focus.level);
  const emitted=new Set<string>();
  for(const {concept,level} of ordered){
    const outcome=concept.outcomes.find(entry=>entry.level===level)!;
    for(const itemId of outcome.itemIds){
      if(emitted.has(itemId))continue;
      emitted.add(itemId);
      const item=graph.curriculum.itemsById.get(itemId)!;
      const mapped=graph.applications.find(app=>app.conceptId===concept.id&&app.itemId===itemId)!;
      if(item.kind!=='unit')throw new Error('Expected unit in learning path: '+itemId);
      steps.push({itemId,title:item.title,role:mapped.role,
        trackTitle:graph.curriculum.tracksById.get(item.trackId)!.title,
        conceptId:concept.id,conceptTitle:concept.title,
        stepLevel:level,reviewedPrerequisite:concept.id!==focus.concept.id||level!==focus.level});
    }
  }
  return {conceptId:focus.concept.id,level:focus.level,steps,missingPrerequisites,reviewedPrerequisiteCount};
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
