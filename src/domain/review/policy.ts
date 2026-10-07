import type { ReviewBank, ReviewAttemptInput } from './schema';

export const REVIEW_POLICY_VERSION = 'v1';
export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;

export type StoredReviewState = 'scheduled' | 'retry' | 'retained';
export type ReviewState = 'scheduled' | 'due' | 'retry' | 'retained';

export type ReviewScheduleRow = {
  itemId: string;
  policyVersion: string;
  step: number;
  dueAt: string | null;
  storedState: StoredReviewState;
};

export type ReviewScheduleView = {
  itemId: string;
  policyVersion: string;
  step: number;
  dueAt: string | null;
  state: ReviewState;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(now: Date, days: number) {
  return new Date(now.getTime() + days * DAY_MS).toISOString();
}

export function initialReviewSchedule(itemId: string, now: Date): ReviewScheduleRow {
  return {
    itemId,
    policyVersion: REVIEW_POLICY_VERSION,
    step: 0,
    dueAt: addDays(now, REVIEW_INTERVAL_DAYS[0]),
    storedState: 'scheduled',
  };
}

export function toReviewView(row: ReviewScheduleRow, now: Date): ReviewScheduleView {
  if (row.storedState === 'retained') return { ...row, state: 'retained' };
  if (row.storedState === 'retry') return { ...row, state: 'retry' };
  const due = row.dueAt ? new Date(row.dueAt).getTime() <= now.getTime() : false;
  return { ...row, state: due ? 'due' : 'scheduled' };
}

export function advanceReviewSchedule(
  row: ReviewScheduleRow,
  passed: boolean,
  now: Date,
): ReviewScheduleRow {
  if (!passed) {
    return {
      ...row,
      dueAt: now.toISOString(),
      storedState: 'retry',
    };
  }

  const nextStep = row.step + 1;
  if (nextStep >= REVIEW_INTERVAL_DAYS.length) {
    return {
      ...row,
      step: nextStep,
      dueAt: null,
      storedState: 'retained',
    };
  }

  return {
    ...row,
    step: nextStep,
    dueAt: addDays(now, REVIEW_INTERVAL_DAYS[nextStep]),
    storedState: 'scheduled',
  };
}

export function gradeReview(bank: ReviewBank, input: ReviewAttemptInput) {
  if (input.questionSetVersion !== bank.version) {
    throw new Error('Versi review tidak cocok.');
  }
  if (input.answers.length !== bank.questions.length) {
    throw new Error('Jawaban review tidak lengkap.');
  }
  for (let index = 0; index < bank.questions.length; index += 1) {
    if (input.answers[index] >= bank.questions[index].options.length) {
      throw new Error('Pilihan jawaban review tidak valid.');
    }
  }

  const score = bank.questions.reduce(
    (total, question, index) => total + (input.answers[index] === question.answer ? 1 : 0),
    0,
  );
  const passed = !input.assisted && score >= 4;

  return {
    score,
    assisted: input.assisted,
    result: passed ? 'passed' as const : 'again' as const,
  };
}
