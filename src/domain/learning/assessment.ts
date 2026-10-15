import { z } from 'zod';
import { itemIdSchema } from '../curriculum-v2/schema';

export type AssessmentPhase = 'practice' | 'recall';
export type AssessmentQuestion = {
  id: string; version: string; itemId: string; competencyId: string;
  phase: AssessmentPhase; prompt: string; options: readonly string[];
  answer: number; explanation: string; misconceptions: Readonly<Record<number, string>>;
};
export type ReviewSchedule = { competencyId: string; step: number; dueAt: string };
export type PublicAssessment = Pick<AssessmentQuestion, 'id' | 'version' | 'itemId' | 'competencyId' | 'phase' | 'prompt' | 'options'>;

export const assessmentAttemptSchema = z.object({
  requestId: z.uuid(),
  revision: z.number().int().nonnegative(),
  itemId: itemIdSchema,
  assessmentId: z.string().min(1),
  assessmentVersion: z.string().min(1),
  phase: z.enum(['practice', 'recall']),
  answer: z.number().int().nonnegative(),
});
export type AssessmentAttempt = z.infer<typeof assessmentAttemptSchema>;

export function publicQuestion(question: AssessmentQuestion): PublicAssessment {
  const { id, version, itemId, competencyId, phase, prompt, options } = question;
  return { id, version, itemId, competencyId, phase, prompt, options };
}
export function gradeAssessment(question: AssessmentQuestion, answer: number) {
  if (!Number.isInteger(answer) || answer < 0 || answer >= question.options.length) {
    throw new Error('Jawaban tidak valid.');
  }
  const correct = answer === question.answer;
  return {
    correct,
    outcome: correct ? 'correct' as const : 'incorrect' as const,
    explanation: question.explanation,
    misconception: correct ? null : question.misconceptions[answer] ?? 'Periksa kembali prediksi.',
    nextAction: correct ? 'review_scheduled' as const : 'retry_with_feedback' as const,
  };
}
export const MICRO_REVIEW_DAYS = [1, 3, 7, 14, 30] as const;
export function nextCompetencyReview(
  previous: ReviewSchedule | undefined,
  phase: AssessmentPhase,
  correct: boolean,
  now: Date,
): ReviewSchedule | undefined {
  if (phase === 'practice' && (!correct || previous)) return undefined;
  const step = phase === 'recall' && correct
    ? Math.min((previous?.step ?? 0) + 1, MICRO_REVIEW_DAYS.length - 1)
    : 0;
  return {
    competencyId: previous?.competencyId ?? '',
    step,
    dueAt: new Date(now.getTime() + MICRO_REVIEW_DAYS[step] * 86_400_000).toISOString(),
  };
}
export type AssessmentPlan =
  | { kind: 'unavailable' | 'waiting'; itemId: string; dueAt?: string }
  | { kind: 'practice' | 'recall'; itemId: string; question: PublicAssessment; dueAt?: string };

export function chooseAssessmentPlan(
  itemId: string,
  questions: readonly AssessmentQuestion[],
  hasCorrectPractice: boolean,
  review: ReviewSchedule | undefined,
  now: Date,
): AssessmentPlan {
  const practice = questions.find((q) => q.itemId === itemId && q.phase === 'practice');
  const recall = questions.find((q) => q.itemId === itemId && q.phase === 'recall');
  if (!practice || !recall) return { kind: 'unavailable', itemId };
  if (review && new Date(review.dueAt).getTime() <= now.getTime()) {
    return { kind: 'recall', itemId, question: publicQuestion(recall), dueAt: review.dueAt };
  }
  if (!hasCorrectPractice) return { kind: 'practice', itemId, question: publicQuestion(practice) };
  return { kind: 'waiting', itemId, dueAt: review?.dueAt };
}
