import type { ItemLearningView } from './view-models';

export type ItemActionState = {
  status: 'passed' | 'stale' | 'active' | 'started' | 'locked' | 'ready' | 'unknown';
  isFocused: boolean;
  canActivate: boolean;
  missingPrerequisites: string[];
};

/**
 * Server-owned learning projection shared by curriculum and item workspaces.
 * A previous 'started' session does not override currently locked prerequisites.
 * Completion (passed/stale) remains independent from activation/availability.
 */
export function getItemActionState(view: ItemLearningView): ItemActionState {
  const status: ItemActionState['status'] =
    view.completion === 'passed' ? 'passed'
    : view.completion === 'stale' ? 'stale'
    : view.isFocused ? 'active'
    : view.availability === 'locked' ? 'locked'
    : view.completion === 'started' ? 'started'
    : view.availability === 'ready' ? 'ready'
    : 'unknown';

  return {
    status,
    isFocused: view.isFocused,
    canActivate: view.availability === 'ready' && view.completion !== 'passed' && !view.isFocused,
    missingPrerequisites: view.missingPrerequisites,
  };
}
