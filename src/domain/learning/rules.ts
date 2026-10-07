import type { CurriculumGraph } from '../curriculum-v2/graph';
import type { Criterion, CurriculumItem } from '../curriculum-v2/schema';

export type CompletionStatus = 'active' | 'passed';

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

export function deriveAvailability(
  graph: CurriculumGraph,
  progress: ItemProgressState[],
): AvailabilityState[] {
  const passed = new Set(progress.filter((item) => item.status === 'passed').map((item) => item.itemId));
  return graph.manifest.items.map((item) => {
    const missingPrerequisites = item.prerequisites.filter((id) => !passed.has(id));
    return {
      itemId: item.id,
      status: missingPrerequisites.length ? 'locked' : 'ready',
      missingPrerequisites,
    };
  });
}

export function assertItemReady(
  graph: CurriculumGraph,
  itemId: string,
  progress: ItemProgressState[],
) {
  const item = graph.itemsById.get(itemId);
  if (!item) throw new Error('Item tidak ada di curriculum.');
  const passed = new Set(progress.filter((entry) => entry.status === 'passed').map((entry) => entry.itemId));
  return item.prerequisites.filter((id) => !passed.has(id));
}
