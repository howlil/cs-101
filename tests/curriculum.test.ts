import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseManifest, type Task } from '../src/domain/curriculum';
const a: Task = { taskId: 'TEST-001', title: 'A', track: 'test', phase: 1, order: 1, prerequisites: [], criteria: [{ id: 'a', text: 'A' }], challenge: 'A', projectRequirements: [] };
test('curriculum menolak ID duplikat, prerequisite hilang, dan siklus', () => {
  assert.throws(() => parseManifest({ version: 1, tasks: [a, a] }), /duplikat/);
  assert.throws(() => parseManifest({ version: 1, tasks: [{ ...a, prerequisites: ['TEST-002'] }] }), /tidak ditemukan/);
  assert.throws(() => parseManifest({ version: 1, tasks: [{ ...a, prerequisites: ['TEST-002'] }, { ...a, taskId: 'TEST-002', prerequisites: ['TEST-001'] }] }), /Siklus/);
});
