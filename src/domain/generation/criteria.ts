import type { CurriculumItem, Criterion } from '../curriculum-v2/schema';

/** Authored content covers curriculum outcomes and the practical challenge. */
export function contentCriteriaForItem(item: CurriculumItem): Criterion[] {
  if (item.kind === 'checkpoint') return item.requirements;
  return [
    ...item.criteria,
    ...(item.kind === 'integration' ? item.requirements : []),
    { id: 'challenge', text: item.challenge.raw || item.challenge.title },
  ];
}
