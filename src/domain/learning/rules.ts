import type { CurriculumGraph } from '../curriculum-v2/graph';
import type { Criterion, CurriculumItem } from '../curriculum-v2/schema';

export type StoredCompletionStatus = 'active' | 'passed';
export type CompletionStatus = StoredCompletionStatus | 'stale';

export type ItemProgressState = {
  itemId: string;
  status: CompletionStatus;
  passedFingerprint: string | null;
  lastAnchor: string;
  continueFrom: string;
};

export type AvailabilityState = {
  itemId: string;
  status: 'locked' | 'ready';
  missingPrerequisites: string[];
};

export function requiredEvidenceForItem(item: CurriculumItem): Criterion[] {
  if (item.kind === 'checkpoint') return item.requirements;
  const base = item.kind === 'unit' ? item.criteria : [...item.criteria, ...item.requirements];
  return [
    ...base,
    { id: 'challenge', text: item.challenge.raw || item.challenge.title },
  ];
}

export function withCurrentCompletion(
  graph: CurriculumGraph,
  progress: ItemProgressState[],
): ItemProgressState[] {
  return progress.map((entry) => {
    if (entry.status !== 'passed') return entry;
    const item = graph.itemsById.get(entry.itemId);
    return item && entry.passedFingerprint === item.fingerprint
      ? entry
      : { ...entry, status: 'stale' as const };
  });
}

export function blockingPrerequisites(item: CurriculumItem): string[] {
  const ids = [
    ...item.prerequisites,
    ...(item.kind === 'checkpoint' && item.parentProjectId ? [item.parentProjectId] : []),
  ];
  return [...new Set(ids)];
}

export function deriveAvailability(
  graph: CurriculumGraph,
  progress: ItemProgressState[],
): AvailabilityState[] {
  const current = withCurrentCompletion(graph, progress);
  const passed = new Set(
    current.filter((entry) => entry.status === 'passed').map((entry) => entry.itemId),
  );

  return graph.manifest.items.map((item) => {
    const missingPrerequisites = blockingPrerequisites(item).filter((id) => !passed.has(id));
    return {
      itemId: item.id,
      status: missingPrerequisites.length ? 'locked' : 'ready',
      missingPrerequisites,
    };
  });
}

export function missingPrerequisites(
  graph: CurriculumGraph,
  itemId: string,
  progress: ItemProgressState[],
) {
  const item = graph.itemsById.get(itemId);
  if (!item) throw new Error('Item tidak ada di curriculum.');
  const current = withCurrentCompletion(graph, progress);
  const passed = new Set(
    current.filter((entry) => entry.status === 'passed').map((entry) => entry.itemId),
  );
  return blockingPrerequisites(item).filter((id) => !passed.has(id));
}
