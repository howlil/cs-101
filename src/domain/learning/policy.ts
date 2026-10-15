import type { CurriculumItem } from '../curriculum-v2/schema';

export type LearningPolicy =
  | { mode: 'foundation'; completion: 'self_check'; prerequisite: 'advisory' }
  | { mode: 'critical'; completion: 'technical_evidence'; prerequisite: 'required' };

export function learningPolicyFor(item: CurriculumItem): LearningPolicy {
  return item.kind === 'unit'
    ? { mode: 'foundation', completion: 'self_check', prerequisite: 'advisory' }
    : { mode: 'critical', completion: 'technical_evidence', prerequisite: 'required' };
}
