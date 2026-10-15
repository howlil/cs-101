import { z } from 'zod';
import { itemIdSchema } from '../curriculum-v2/schema';

export type AssessmentPhase = 'practice' | 'transfer' | 'recall';
export type AssessmentOutcome = 'incorrect' | 'correct_unassisted' | 'correct_after_feedback' | 'legacy_unknown';
export type AssessmentQuestion = {
  id: string; version: string; itemId: string; competencyId: string; curriculumFingerprint: string;
  phase: AssessmentPhase; prompt: string; options: readonly string[];
  answer: number; explanation: string; misconceptions: Readonly<Record<number, string>>;
};
export type ReviewSchedule = { competencyId: string; step: number; dueAt: string };
export type AssessmentHistory = { assessmentId: string; phase: AssessmentPhase; correct: boolean; outcome: AssessmentOutcome };
export type PublicAssessment = Pick<AssessmentQuestion,
  'id' | 'version' | 'itemId' | 'competencyId' | 'phase' | 'prompt' | 'options'>;

export const assessmentAttemptSchema = z.object({
  requestId: z.uuid(), revision: z.number().int().nonnegative(), itemId: itemIdSchema,
  assessmentId: z.string().min(1), assessmentVersion: z.string().min(1),
  phase: z.enum(['practice', 'transfer', 'recall']), answer: z.number().int().nonnegative(),
});
export type AssessmentAttempt = z.infer<typeof assessmentAttemptSchema>;

export function publicQuestion(question: AssessmentQuestion): PublicAssessment {
  const { id, version, itemId, competencyId, phase, prompt, options } = question;
  return { id, version, itemId, competencyId, phase, prompt, options };
}

export function gradeAssessment(question: AssessmentQuestion, answer: number, history: readonly AssessmentHistory[] = []) {
  if (!Number.isInteger(answer) || answer < 0 || answer >= question.options.length) {
    throw new Error('Jawaban tidak valid.');
  }
  const correct = answer === question.answer;
  // Any previous attempt on this exact question has already exposed its explanation.
  const assisted = history.some((previous) => previous.assessmentId === question.id);
  const outcome: AssessmentOutcome = !correct ? 'incorrect'
    : assisted ? 'correct_after_feedback' : 'correct_unassisted';
  return {
    correct, outcome,
    explanation: question.explanation,
    misconception: correct ? null : question.misconceptions[answer] ?? 'Periksa kembali prediksi.',
    nextAction: !correct ? 'transfer_or_remediate' as const
      : assisted ? 'practice_without_hints' as const : 'review_scheduled' as const,
  };
}

export const MICRO_REVIEW_DAYS = [1, 3, 7, 14, 30] as const;
export function nextCompetencyReview(previous: ReviewSchedule | undefined,
  phase: AssessmentPhase, correct: boolean, now: Date): ReviewSchedule | undefined {
  if (phase !== 'recall' && (!correct || previous)) return undefined;
  const step = phase === 'recall' && correct
    ? Math.min((previous?.step ?? 0) + 1, MICRO_REVIEW_DAYS.length - 1) : 0;
  return {
    competencyId: previous?.competencyId ?? '',
    step,
    dueAt: new Date(now.getTime() + MICRO_REVIEW_DAYS[step] * 86_400_000).toISOString(),
  };
}

export type AssessmentPlan =
  | { kind: 'unavailable'; itemId: string }
  | { kind: 'waiting'; itemId: string; dueAt?: string }
  | { kind: 'needs_support'; itemId: string }
  | { kind: 'practice'; itemId: string; question: PublicAssessment }
  | { kind: 'transfer'; itemId: string; question: PublicAssessment }
  | { kind: 'recall'; itemId: string; question: PublicAssessment; dueAt?: string };

/** Content version is checked by the server before this decision is reached. */
export function chooseAssessmentPlan(itemId: string, questions: readonly AssessmentQuestion[],
  hasCorrectPractice: boolean, review: ReviewSchedule | undefined, now: Date,
  history: readonly AssessmentHistory[] = []): AssessmentPlan {
  const practice = questions.find((q) => q.itemId === itemId && q.phase === 'practice');
  const recall = questions.find((q) => q.itemId === itemId && q.phase === 'recall');
  if (!practice || !recall) return { kind: 'unavailable', itemId };
  if (review && new Date(review.dueAt).getTime() <= now.getTime()) {
    return { kind: 'recall', itemId, question: publicQuestion(recall), dueAt: review.dueAt };
  }
  if (hasCorrectPractice || review) return { kind: 'waiting', itemId, dueAt: review?.dueAt };
  if (history.some((attempt) => attempt.assessmentId === practice.id)) {
    const next = questions.find((q) => q.itemId === itemId && q.phase === 'transfer' &&
      !history.some((attempt) => attempt.assessmentId === q.id));
    return next ? { kind: 'transfer', itemId, question: publicQuestion(next) }
      : { kind: 'needs_support', itemId };
  }
  return { kind: 'practice', itemId, question: publicQuestion(practice) };
}

/** Activity isn't verification: never infer studied/passed from attempt history. */
export function assessmentActivity(history: readonly AssessmentHistory[], review?: ReviewSchedule) {
  return {
    attempted: history.length > 0,
    understanding: review ? 'demonstrated' as const
      : history.length ? 'needs_support' as const : 'not_assessed' as const,
  };
}
