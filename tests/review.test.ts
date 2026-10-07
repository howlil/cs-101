import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  REVIEW_INTERVAL_DAYS,
  advanceReviewSchedule,
  gradeReview,
  initialReviewSchedule,
  toReviewView,
} from '../src/domain/review/policy';
import { reviewBankSchema } from '../src/domain/review/schema';

const now = new Date('2026-10-07T00:00:00.000Z');
const bank = reviewBankSchema.parse({
  itemId: 'TEST-001',
  version: 'review-v1',
  curriculumFingerprint: 'sha256:' + 'a'.repeat(64),
  questions: Array.from({ length: 5 }, (_, index) => ({
    id: 'q' + (index + 1),
    prompt: 'Question ' + (index + 1),
    options: ['correct', 'wrong'],
    answer: 0,
    explanation: 'Because.',
    criterionIds: [],
  })),
});

test('review policy menjadwalkan interval 1,3,7,14,30 hari lalu retained', () => {
  let row = initialReviewSchedule('TEST-001', now);
  assert.equal(row.step, 0);
  assert.equal(row.dueAt, '2026-10-08T00:00:00.000Z');
  assert.equal(toReviewView(row, now).state, 'scheduled');
  assert.equal(toReviewView(row, new Date('2026-10-08T00:00:00.000Z')).state, 'due');

  for (let index = 1; index < REVIEW_INTERVAL_DAYS.length; index += 1) {
    row = advanceReviewSchedule(row, true, now);
    assert.equal(row.step, index);
    assert.equal(
      row.dueAt,
      new Date(now.getTime() + REVIEW_INTERVAL_DAYS[index] * 86_400_000).toISOString(),
    );
  }

  row = advanceReviewSchedule(row, true, now);
  assert.equal(row.storedState, 'retained');
  assert.equal(row.dueAt, null);
});

test('review gagal menjadi retry tanpa mengubah step', () => {
  const initial = initialReviewSchedule('TEST-001', now);
  const retry = advanceReviewSchedule(initial, false, now);
  assert.equal(retry.step, initial.step);
  assert.equal(retry.storedState, 'retry');
  assert.equal(toReviewView(retry, now).state, 'retry');
});

test('grade review butuh >=4/5 dan tidak assisted', () => {
  assert.deepEqual(
    gradeReview(bank, {
      requestId: '00000000-0000-4000-8000-000000000001',
      revision: 0,
      itemId: 'TEST-001',
      questionSetVersion: 'review-v1',
      answers: [0, 0, 0, 0, 1],
      assisted: false,
    }),
    { score: 4, assisted: false, result: 'passed' },
  );

  assert.deepEqual(
    gradeReview(bank, {
      requestId: '00000000-0000-4000-8000-000000000002',
      revision: 0,
      itemId: 'TEST-001',
      questionSetVersion: 'review-v1',
      answers: [0, 0, 0, 0, 0],
      assisted: true,
    }),
    { score: 5, assisted: true, result: 'again' },
  );
});
