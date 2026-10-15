import type { AssessmentPlan } from './assessment';

export type SuggestedLearningAction = {
  label: string;
  instruction?: string;
  focusPractice: boolean;
};
/** Pure choice for the next meaningful learning action; no completion side effects. */
export function nextLearningAction(plan: AssessmentPlan | undefined): SuggestedLearningAction | undefined {
  if (!plan) return undefined;
  switch (plan.kind) {
    case 'practice':
      return { label: 'Coba prediksi', instruction: plan.question.prompt, focusPractice: true };
    case 'transfer':
      return { label: 'Coba soal variasi', instruction: plan.question.prompt, focusPractice: true };
    case 'needs_support':
      return { label: 'Perkuat pemahaman', instruction: 'Periksa mental model SQL NULL, lalu coba query baru secara mandiri.', focusPractice: true };
    case 'waiting':
      return { label: 'Lanjut implementasi', focusPractice: false };
    case 'recall':
      return { label: 'Review singkat', instruction: plan.question.prompt, focusPractice: true };
    case 'unavailable':
      return undefined;
  }
}
