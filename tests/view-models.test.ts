import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCurriculumSearchIndex,
  searchCurriculum,
} from '../src/domain/curriculum-v2/selectors';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { curriculumItemFingerprint } from '../src/domain/curriculum-v2/schema';
import {
  getItemLearningView,
  getProgressOverview,
  getTodayView,
  itemStateMarker,
  type LearningViewState,
} from '../src/domain/learning/view-models';

const fp = <T extends object>(item: T) => ({
  ...item,
  fingerprint: curriculumItemFingerprint(item),
});

const first = fp({
  id: 'JAV-001',
  kind: 'unit' as const,
  trackId: 'java',
  moduleId: 'java-core',
  order: 1,
  title: 'Java Toolchain',
  scope: ['JDK', 'javac', 'bytecode'],
  criteria: [{ id: 'c1', text: 'Explain compile run flow' }],
  challenge: { title: 'Compile', steps: ['Run javac'], raw: 'Compile\n- Run javac' },
  prerequisites: [],
  marketExpectation: [],
  source: { title: 'Dev.java', url: 'https://dev.java/' },
  crossModuleReferenceRaw: [],
});

const second = fp({
  ...first,
  id: 'JAV-002',
  order: 2,
  title: 'Object Contracts',
  scope: ['equals', 'hashCode'],
  prerequisites: ['JAV-001'],
});

const project = fp({
  id: 'JAV-P01',
  kind: 'checkpoint' as const,
  trackId: 'java',
  moduleId: 'java-core',
  order: 3,
  title: 'Ledger Project',
  problemStatement: 'Build a ledger',
  requirements: [{ id: 'r1', text: 'Ledger works' }],
  prerequisites: ['JAV-002'],
  source: { title: 'Project brief' },
});

const integration = fp({
  id: 'INT-001',
  kind: 'integration' as const,
  order: 1,
  title: 'Bootstrap Integration',
  brief: 'Combine Java with another track',
  scope: ['bootstrap', 'integration'],
  challenge: { title: 'Integrate', steps: ['Run'], raw: 'Integrate' },
  criteria: [{ id: 'i1', text: 'Integrated flow works' }],
  requirements: [],
  prerequisites: ['JAV-002'],
  source: { title: 'Integration brief' },
});

const graph = buildCurriculumGraph({
  version: 2,
  tracks: [{ id: 'java', title: 'Java', order: 1 }],
  modules: [{ id: 'java-core', trackId: 'java', title: 'Java Core', order: 1 }],
  items: [first, second, project, integration],
  relations: [
    { from: 'JAV-001', to: 'JAV-002', type: 'prerequisite' },
    { from: 'JAV-002', to: 'JAV-P01', type: 'prerequisite' },
    { from: 'JAV-002', to: 'INT-001', type: 'prerequisite' },
  ],
});

const baseState = (): LearningViewState => ({
  activeItemId: null,
  progress: [],
  availability: [
    { itemId: 'JAV-001', status: 'ready', missingPrerequisites: [] },
    { itemId: 'JAV-002', status: 'locked', missingPrerequisites: ['JAV-001'] },
    { itemId: 'JAV-P01', status: 'locked', missingPrerequisites: ['JAV-002'] },
    { itemId: 'INT-001', status: 'locked', missingPrerequisites: ['JAV-002'] },
  ],
  reviews: [],
});

test('item view membedakan focus active dari item yang hanya pernah started', () => {
  const state = baseState();
  state.activeItemId = 'JAV-002';
  state.progress = [
    {
      itemId: 'JAV-001',
      status: 'active',
      passedFingerprint: null,
      lastAnchor: '',
      continueFrom: 'old work',
    },
    {
      itemId: 'JAV-002',
      status: 'active',
      passedFingerprint: null,
      lastAnchor: '',
      continueFrom: 'current work',
    },
  ];
  state.availability[1] = { itemId: 'JAV-002', status: 'ready', missingPrerequisites: [] };

  const old = getItemLearningView(graph, state, 'JAV-001');
  const current = getItemLearningView(graph, state, 'JAV-002');

  assert.equal(old.completion, 'started');
  assert.equal(old.displayState, 'started');
  assert.equal(itemStateMarker(old.displayState, old.item.kind), '◐');
  assert.equal(current.completion, 'active');
  assert.equal(current.displayState, 'active');
});

test('Today tidak lanjut ke active pointer yang itemnya sudah passed', () => {
  const state = baseState();
  state.activeItemId = 'JAV-001';
  state.progress = [{
    itemId: 'JAV-001',
    status: 'passed',
    passedFingerprint: first.fingerprint,
    lastAnchor: '',
    continueFrom: '',
  }];
  state.availability[1] = { itemId: 'JAV-002', status: 'ready', missingPrerequisites: [] };

  const today = getTodayView(graph, state);
  assert.equal(today.primaryMode, 'next');
  assert.equal(today.primary?.item.id, 'JAV-002');
});

test('Today hanya memasukkan review actionable untuk completion current passed', () => {
  const state = baseState();
  state.progress = [
    {
      itemId: 'JAV-001',
      status: 'passed',
      passedFingerprint: first.fingerprint,
      lastAnchor: '',
      continueFrom: '',
    },
    {
      itemId: 'JAV-002',
      status: 'stale',
      passedFingerprint: 'sha256:' + '0'.repeat(64),
      lastAnchor: '',
      continueFrom: '',
    },
  ];
  state.reviews = [
    { itemId: 'JAV-001', policyVersion: 'v1', step: 0, dueAt: '2026-10-07T00:00:00Z', state: 'due' },
    { itemId: 'JAV-002', policyVersion: 'v1', step: 0, dueAt: '2026-10-07T00:00:00Z', state: 'retry' },
  ];

  const today = getTodayView(graph, state);
  assert.deepEqual(today.actionableReviews.map((entry) => entry.item.item.id), ['JAV-001']);
});

test('progress overview menghitung hierarchy, active focus, dan review action', () => {
  const state = baseState();
  state.activeItemId = 'JAV-002';
  state.progress = [
    {
      itemId: 'JAV-001',
      status: 'passed',
      passedFingerprint: first.fingerprint,
      lastAnchor: '',
      continueFrom: '',
    },
    {
      itemId: 'JAV-002',
      status: 'active',
      passedFingerprint: null,
      lastAnchor: '',
      continueFrom: '',
    },
  ];
  state.availability[1] = { itemId: 'JAV-002', status: 'ready', missingPrerequisites: [] };
  state.reviews = [
    { itemId: 'JAV-001', policyVersion: 'v1', step: 0, dueAt: '2026-10-07T00:00:00Z', state: 'due' },
  ];

  const overview = getProgressOverview(graph, state);
  assert.equal(overview.tracks[0].completed, 1);
  assert.equal(overview.tracks[0].modules[0].active, true);
  assert.equal(overview.tracks[0].reviewActions, 1);
  assert.equal(overview.actionableReviews.length, 1);
  assert.equal(overview.integrations[0].displayState, 'locked');
});

test('ranked search memprioritaskan exact ID dan mendukung scope, track, module', () => {
  const index = buildCurriculumSearchIndex(graph);

  assert.equal(searchCurriculum(index, 'jav-002')[0]?.itemId, 'JAV-002');
  assert.equal(searchCurriculum(index, 'bytecode')[0]?.itemId, 'JAV-001');
  assert.ok(searchCurriculum(index, 'java core').some((entry) => entry.itemId === 'JAV-001'));
  assert.ok(searchCurriculum(index, 'bootstrap').some((entry) => entry.itemId === 'INT-001'));
  assert.deepEqual(searchCurriculum(index, 'does-not-exist'), []);
});
