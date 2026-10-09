import assert from 'node:assert/strict';
import test from 'node:test';
import type { CurriculumItem } from '../src/domain/curriculum-v2/schema';
import {
  LearningError,
  assertItemCanActivate,
  assertReviewAllowed,
  assertSessionAllowed,
} from '../src/domain/learning/decisions';
import type { SessionFields } from '../src/domain/learning/schema';

const fingerprint = 'sha256:' + 'a'.repeat(64);
const item = {
  id: 'SQL-001',
  kind: 'unit',
  fingerprint,
  criteria: [{ id: 'c1', text: 'Explain the invariant' }],
  challenge: { title: 'Implement it', raw: 'Implement it' },
} as CurriculumItem;

const session: SessionFields = {
  itemId: item.id,
  fingerprint,
  kind: 'passed',
  evidence: [
    { criterionId: 'c1', text: 'Demonstrated' },
    { criterionId: 'challenge', text: 'Test passed' },
  ],
  continueFrom: '',
  blocker: '',
  lastAnchor: '',
};

const status = (expected: number) => (error: unknown) =>
  error instanceof LearningError && error.status === expected;

test('shared session decision requires matching fingerprint and active item', () => {
  assert.doesNotThrow(() => assertSessionAllowed(item, session, item.id));
  assert.throws(() => assertSessionAllowed(item, { ...session, fingerprint: 'sha256:' + 'b'.repeat(64) }, item.id), status(409));
  assert.throws(() => assertSessionAllowed(item, session, null), status(409));
});

test('shared session decision requires evidence precisely once', () => {
  assert.throws(() => assertSessionAllowed(item, { ...session, evidence: [session.evidence[0]] }, item.id), status(422));
  assert.throws(() => assertSessionAllowed(item, { ...session, evidence: [...session.evidence, session.evidence[0]] }, item.id), status(422));
  assert.doesNotThrow(() => assertSessionAllowed(item, { ...session, kind: 'progress', evidence: [], continueFrom: 'Next' }, item.id));
  assert.throws(() => assertSessionAllowed(item, { ...session, kind: 'progress', evidence: [] }, item.id), status(422));
});

test('shared activation decision blocks locked prerequisites', () => {
  assert.throws(() => assertItemCanActivate(item.id, [{
    itemId: item.id, status: 'locked', missingPrerequisites: ['SQL-000'],
  }]), status(422));
  assert.doesNotThrow(() => assertItemCanActivate(item.id, [{
    itemId: item.id, status: 'ready', missingPrerequisites: [],
  }]));
});

test('shared review decision requires current completion and actionable review', () => {
  const progress = [{
    itemId: item.id, status: 'passed' as const, passedFingerprint: fingerprint,
    lastAnchor: '', continueFrom: '',
  }];
  assert.throws(() => assertReviewAllowed(item.id, [], [{ itemId: item.id, state: 'due' }]), status(422));
  assert.throws(() => assertReviewAllowed(item.id, progress, []), status(422));
  assert.throws(() => assertReviewAllowed(item.id, progress, [{ itemId: item.id, state: 'scheduled' }]), status(422));
  assert.throws(() => assertReviewAllowed(item.id, progress, [{ itemId: item.id, state: 'retained' }]), status(422));
  assert.doesNotThrow(() => assertReviewAllowed(item.id, progress, [{ itemId: item.id, state: 'due' }]));
  assert.doesNotThrow(() => assertReviewAllowed(item.id, progress, [{ itemId: item.id, state: 'retry' }]));
});
