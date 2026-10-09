import assert from 'node:assert/strict';
import test from 'node:test';
import { getItemActionState } from '../src/domain/learning/item-action';
import type { ItemLearningView } from '../src/domain/learning/view-models';

function input(overrides: Partial<ItemLearningView>): ItemLearningView {
  return {
    completion: 'not_started',
    displayState: 'unknown',
    availability: 'ready',
    isFocused: false,
    missingPrerequisites: [],
    continueFrom: '',
    review: 'none',
    reviewDueAt: null,
    // This helper only reads learning state, never the item/domain object.
    item: {} as ItemLearningView['item'],
    href: '/learn/SQL-001',
    ...overrides,
  };
}

test('locked prerequisites override historical started state', () => {
  assert.deepEqual(getItemActionState(input({
    completion: 'started', displayState: 'started', availability: 'locked',
    missingPrerequisites: ['JAV-001'],
  })), {
    status: 'locked', isFocused: false, canActivate: false,
    missingPrerequisites: ['JAV-001'],
  });
});

test('ready, active, passed, stale are not conflated', () => {
  assert.equal(getItemActionState(input({})).status, 'ready');
  const focused = getItemActionState(input({ completion: 'active', isFocused: true }));
  assert.equal(focused.status, 'active');
  assert.equal(focused.canActivate, false);
  const passed = getItemActionState(input({
    completion: 'passed', displayState: 'passed', isFocused: false,
  }));
  assert.equal(passed.status, 'passed');
  assert.equal(passed.canActivate, false);
  const stale = getItemActionState(input({
    completion: 'stale', displayState: 'stale',
  }));
  assert.equal(stale.status, 'stale');
  assert.equal(stale.canActivate, true);
});
