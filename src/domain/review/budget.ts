import type { AssessmentPlan } from '../learning/assessment';

type RecallPlan = Extract<AssessmentPlan, { kind: 'recall' }>;
export const DEFAULT_MICRO_REVIEW_LIMIT = 3;

/** Budget is a display bound, never a deletion or penalty for postponed items. */
export function selectMicroRecallQueue(
  plans: readonly AssessmentPlan[],
  limit = DEFAULT_MICRO_REVIEW_LIMIT,
  maxEstimatedSeconds = 300,
): RecallPlan[] {
  const max = Number.isFinite(limit) ? Math.max(0, Math.min(10, Math.floor(limit))) : 0;
  const budget = Number.isFinite(maxEstimatedSeconds) ? Math.max(0, maxEstimatedSeconds) : 0;
  const queue = plans.filter((plan): plan is RecallPlan => plan.kind === 'recall')
    .sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? '') || a.itemId.localeCompare(b.itemId));
  const result: RecallPlan[] = [];
  let seconds = 0;
  for (const plan of queue) {
    if (result.length >= max) break;
    const cost = 90; // Conservative UX estimate, not observed duration.
    if (seconds + cost > budget) continue;
    result.push(plan);
    seconds += cost;
  }
  return result;
}
