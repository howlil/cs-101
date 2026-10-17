import type { CurriculumGraph } from './curriculum-v2/graph';
import type { CurriculumItem, ProjectCheckpoint } from './curriculum-v2/schema';

export function libraryHref(itemId: string): string {
  return '/?item=' + encodeURIComponent(itemId);
}

export type LibraryView = 'materi' | 'soal' | 'project';

/**
 * A view is a real, server-selected reading surface, not an anchor to scroll.
 * Checkpoint/integration records have project content only; don't fabricate a quiz.
 */
export function resolveLibraryView(requested: string | null, kind: CurriculumItem['kind']): LibraryView {
  if (kind !== 'unit') return 'project';
  return requested === 'soal' || requested === 'project' ? requested : 'materi';
}

export function libraryViewHref(itemId: string, view: LibraryView): string {
  return libraryHref(itemId) + (view === 'materi' ? '' : '&view=' + view);
}

/** Query parameters select content only: no progress, sessions, or writes. */
export function selectLibraryItem(
  graph: CurriculumGraph,
  requestedTrackId: string | null,
  requestedItemId: string | null,
): { trackId: string; item: CurriculumItem | undefined } {
  const tracks = [...graph.manifest.tracks].sort((a, b) => a.order - b.order);
  const requested = requestedItemId ? graph.itemsById.get(requestedItemId) : undefined;
  const trackId = requested?.kind !== 'integration' && requested
    ? requested.trackId
    : tracks.some((track) => track.id === requestedTrackId)
      ? requestedTrackId!
      : tracks[0]?.id ?? '';
  const first = graph.manifest.modules
    .filter((module) => module.trackId === trackId)
    .sort((a, b) => a.order - b.order)
    .flatMap((module) => graph.moduleItems.get(module.id) ?? [])[0];
  return { trackId, item: requested ?? (first ? graph.itemsById.get(first) : undefined) };
}

/** Prefer a contributed-to checkpoint; otherwise use the nearest module project. */
export function projectIdeaFor(graph: CurriculumGraph, item: CurriculumItem): ProjectCheckpoint | undefined {
  if (item.kind === 'checkpoint') return item;
  if (item.kind === 'integration') return undefined;
  const linked = (graph.relationsFrom.get(item.id) ?? [])
    .filter((relation) => relation.type === 'contributes_to')
    .map((relation) => graph.itemsById.get(relation.to))
    .find((candidate): candidate is ProjectCheckpoint => candidate?.kind === 'checkpoint');
  if (linked) return linked;
  return (graph.moduleItems.get(item.moduleId) ?? [])
    .map((id) => graph.itemsById.get(id))
    .filter((candidate): candidate is ProjectCheckpoint => candidate?.kind === 'checkpoint')
    .sort((a, b) => Math.abs(a.order - item.order) - Math.abs(b.order - item.order))[0];
}
