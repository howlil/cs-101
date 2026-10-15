import test from 'node:test';
import assert from 'node:assert/strict';
import { selectMicroRecallQueue } from '../src/domain/review/budget';
import type { AssessmentPlan } from '../src/domain/learning/assessment';

const question = {
  id: 'q', version: 'v1', itemId: 'SQL-001',
  competencyId: 'sql-null', phase: 'recall' as const,
  prompt: 'Predict', options: ['A', 'B'],
};
const candidates: AssessmentPlan[] = Array.from({ length: 8 }, (_, index) => ({
  kind: 'recall', itemId: 'SQL-00' + (index + 1),
  dueAt: new Date(Date.UTC(2026, 9, 16 - index)).toISOString(),
  question: { ...question, itemId: 'SQL-00' + (index + 1) },
}));
test('review budget caps visible queue without mutating overdue history', () => {
  const copy = structuredClone(candidates);
  const selected = selectMicroRecallQueue(candidates);
  assert.equal(selected.length, 3);
  assert.equal(selected[0].itemId, 'SQL-008');
  assert.deepEqual(candidates, copy);
  assert.deepEqual(selectMicroRecallQueue(candidates, 0), []);
});
