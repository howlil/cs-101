import type { LearningSnapshot } from './learning/contract';

// Astro.locals is unique per SSR request. No data is shared between requests.
const snapshots = new WeakMap<object, Promise<LearningSnapshot>>();

export function snapshotForRequest(
  locals: object,
  load: () => Promise<LearningSnapshot> = async () => (await (await import('./runtime')).learning()).snapshot(),
): Promise<LearningSnapshot> {
  const existing = snapshots.get(locals);
  if (existing) return existing;
  const pending = load();
  snapshots.set(locals, pending);
  return pending;
}
