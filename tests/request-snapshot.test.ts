import assert from 'node:assert/strict';
import test from 'node:test';
import { snapshotForRequest } from '../src/server/request-snapshot';
import type { LearningSnapshot } from '../src/server/learning';

const snapshot = (revision: number): LearningSnapshot => ({
  activeItemId: null,
  activeTaskId: null,
  revision,
  progress: [],
  availability: [],
  reviews: [],
});

test('page and layout share one snapshot per request', async () => {
  const request = {};
  let reads = 0;
  const load = async () => { reads++; return snapshot(7); };
  const [page, layout] = await Promise.all([
    snapshotForRequest(request, load),
    snapshotForRequest(request, load),
  ]);
  assert.equal(reads, 1);
  assert.strictEqual(page, layout);
});

test('a different request reads fresh learner state', async () => {
  let reads = 0;
  const load = async () => snapshot(++reads);
  const first = await snapshotForRequest({}, load);
  const second = await snapshotForRequest({}, load);
  assert.equal(first.revision, 1);
  assert.equal(second.revision, 2);
});
