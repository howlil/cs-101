import type { AssessmentPlan } from '../learning/assessment';

type RecallPlan = Extract<AssessmentPlan, { kind: 'recall' }>;
export const DEFAULT_MICRO_REVIEW_LIMIT = 3;

/** Budget is a display bound, never a deletion or penalty for postponed items. */
export function selectMicroRecallQueue(
  plans: readonly AssessmentPlan[],
  limit = DEFAULT_MICRO_REVIEW_LIMIT,
): RecallPlan[] {
  const max = Number.isFinite(limit) ? Math.max(0, Math.min(10, Math.floor(limit))) : 0;
  return plans.filter((plan): plan is RecallPlan => plan.kind === 'recall')
    .sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? '') || a.itemId.localeCompare(b.itemId))
    .slice(0, max);
}
