import type { CurriculumGraph } from '../curriculum-v2/graph';
import type { CurriculumItem, Criterion } from '../curriculum-v2/schema';
import { getConnectionGroups, getItemLocation, getProjectNavigation } from '../curriculum-v2/selectors';
import type { GenerationContext } from './schema';

const toContextItem = (item: CurriculumItem) => ({
  id: item.id,
  kind: item.kind,
  title: item.title,
  fingerprint: item.fingerprint,
});

function criteriaFor(item: CurriculumItem): Criterion[] {
  if (item.kind === 'checkpoint') return item.requirements;
  return item.criteria;
}

function scopeFor(item: CurriculumItem): string[] {
  if (item.kind === 'unit' || item.kind === 'integration') return item.scope;
  return [item.problemStatement];
}

function sourceFor(item: CurriculumItem) {
  return item.source;
}

function moduleWindow(graph: CurriculumGraph, item: CurriculumItem, radius = 2) {
  if (item.kind === 'integration') return [];
  const ids = graph.moduleItems.get(item.moduleId) ?? [];
  const index = ids.indexOf(item.id);
  if (index < 0) return [];
  return ids
    .slice(Math.max(0, index - radius), index + radius + 1)
    .filter((id) => id !== item.id)
    .map((id) => graph.itemsById.get(id))
    .filter((entry): entry is CurriculumItem => !!entry)
    .map(toContextItem);
}

function nearestCheckpoint(graph: CurriculumGraph, item: CurriculumItem) {
  if (item.kind === 'checkpoint') return item;
  const connections = getConnectionGroups(graph, item.id);
  const checkpoint = connections.contributesTo
    .map((entry) => entry.item)
    .find((entry) => entry.kind === 'checkpoint');
  if (checkpoint) return checkpoint;
  if (item.kind === 'integration') return undefined;

  const ids = graph.moduleItems.get(item.moduleId) ?? [];
  const candidates = ids
    .map((id) => graph.itemsById.get(id))
    .filter((entry): entry is CurriculumItem => !!entry)
    .filter((entry) => entry.kind === 'checkpoint')
    .sort((a, b) => Math.abs(a.order - item.order) - Math.abs(b.order - item.order) || a.order - b.order);
  return candidates[0];
}

function projectLineage(graph: CurriculumGraph, checkpoint: CurriculumItem | undefined) {
  if (!checkpoint || checkpoint.kind !== 'checkpoint') return [];
  const lineage: CurriculumItem[] = [];
  let current = checkpoint;
  while (current.parentProjectId) {
    const parent = graph.itemsById.get(current.parentProjectId);
    if (!parent || parent.kind !== 'checkpoint') break;
    lineage.unshift(parent);
    current = parent;
  }
  lineage.push(checkpoint);
  return lineage.map(toContextItem);
}

export function resolveGenerationContext(
  graph: CurriculumGraph,
  itemId: string,
): GenerationContext {
  const target = graph.itemsById.get(itemId);
  if (!target) throw new Error('Item tidak ditemukan: ' + itemId);

  const location = getItemLocation(graph, itemId);
  const connections = getConnectionGroups(graph, itemId);
  const checkpoint = nearestCheckpoint(graph, target);

  return {
    version: 1,
    target: toContextItem(target),
    location: {
      trackId: location.track?.id,
      trackTitle: location.track?.title,
      moduleId: location.module?.id,
      moduleTitle: location.module?.title,
    },
    scope: scopeFor(target),
    criteria: criteriaFor(target),
    challenge: target.kind === 'unit' || target.kind === 'integration'
      ? target.challenge
      : undefined,
    problemStatement: target.kind === 'checkpoint' ? target.problemStatement : undefined,
    requirements: target.kind === 'checkpoint'
      ? target.requirements
      : target.kind === 'integration'
        ? target.requirements
        : [],
    prerequisites: (graph.prerequisites.get(itemId) ?? [])
      .map((id) => graph.itemsById.get(id))
      .filter((entry): entry is CurriculumItem => !!entry)
      .map(toContextItem),
    moduleContext: moduleWindow(graph, target),
    nearestCheckpoint: checkpoint ? toContextItem(checkpoint) : undefined,
    projectLineage: projectLineage(graph, checkpoint),
    connections: {
      related: connections.related.slice(0, 3).map((entry) => toContextItem(entry.item)),
      deepDive: connections.deepDive.slice(0, 2).map((entry) => toContextItem(entry.item)),
      foundation: [
        ...connections.builtOnFoundation,
        ...connections.foundationFor,
      ].slice(0, 3).map((entry) => toContextItem(entry.item)),
      contributesTo: connections.contributesTo.slice(0, 3).map((entry) => toContextItem(entry.item)),
    },
    curriculumSource: sourceFor(target),
    generatedFrom: {
      manifestVersion: 2,
      itemFingerprint: target.fingerprint,
    },
  };
}
