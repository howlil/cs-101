import test from 'node:test';
import assert from 'node:assert/strict';
import { nextLearningAction } from '../src/domain/learning/next-action';
import { assessmentQuestionsForItem } from '../src/server/assessment-bank';
import { chooseAssessmentPlan } from '../src/domain/learning/assessment';

test('next learning action advances to transfer without mandatory evidence', () => {
  const questions = assessmentQuestionsForItem('SQL-001');
  const initial = chooseAssessmentPlan('SQL-001', questions, false, undefined, new Date());
  assert.equal(nextLearningAction(initial)?.label, 'Coba prediksi');
  const afterWrong = chooseAssessmentPlan('SQL-001', questions, false, undefined, new Date(), [
    { assessmentId: 'sql-null-predict-01', phase: 'practice', correct: false, outcome: 'incorrect' },
  ]);
  assert.equal(nextLearningAction(afterWrong)?.label, 'Coba soal variasi');
  const waiting = chooseAssessmentPlan('SQL-001', questions, true, undefined, new Date());
  assert.equal(nextLearningAction(waiting)?.label, 'Lanjut implementasi');
  assert.equal(nextLearningAction(waiting)?.focusPractice, false);
});
