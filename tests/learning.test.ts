import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../src/server/storage';
import { LearningService, LearningError } from '../src/server/learning';
import { fingerprint, type Task } from '../src/domain/curriculum';

const task: Task = { taskId: 'TEST-001', title: 'Fixture', track: 'test', phase: 1, order: 1, prerequisites: [], criteria: [{ id: 'predict', text: 'Prediksi hasil' }], challenge: 'Jalankan contoh', projectRequirements: [] };
const next: Task = { ...task, taskId: 'TEST-002', order: 2 };
const envelope = (revision: number) => ({ requestId: randomUUID(), revision });
const session = (revision: number) => ({ ...envelope(revision), taskId: task.taskId, fingerprint: fingerprint(task), kind: 'progress', evidence: [], continueFrom: 'Lanjut latihan 2' });
function fixture(ready = true) {
  const db = openDatabase(':memory:');
  const service = new LearningService(db, [task, next], () => ready);
  service.setActiveTask({ ...envelope(0), taskId: task.taskId });
  return { db, service };
}

test('retry identik tidak menggandakan sesi, bahkan setelah revision berubah', () => {
  const { db, service } = fixture();
  try {
    const input = session(1);
    const saved = service.saveSession(input);
    assert.equal(saved.revision, 2);
    assert.deepEqual(service.saveSession(input), saved);
    assert.equal(service.export().sessions.length, 1);
    assert.throws(() => service.saveSession({ ...input, continueFrom: 'Berbeda' }), (e) => e instanceof LearningError && e.status === 409);
  } finally { db.close(); }
});

test('dua tab dengan revision lama mendapat konflik tanpa menulis sesi kedua', () => {
  const { db, service } = fixture();
  try {
    service.saveSession(session(1));
    assert.throws(() => service.saveSession(session(1)), (e) => e instanceof LearningError && e.status === 409);
    assert.equal(service.export().sessions.length, 1);
  } finally { db.close(); }
});

test('kelulusan membutuhkan bukti semua kriteria dan challenge', () => {
  const { db, service } = fixture();
  try {
    assert.throws(() => service.saveSession({ ...session(1), kind: 'passed', evidence: [{ criterionId: 'predict', text: 'Prediksi' }] }), /Lengkapi bukti/);
    assert.equal(service.snapshot().revision, 1);
    assert.equal(service.export().sessions.length, 0);
    const saved = service.saveSession({ ...session(1), kind: 'passed', evidence: [{ criterionId: 'predict', text: 'Prediksi' }, { criterionId: 'challenge', text: 'Output eksekusi' }] });
    assert.equal(saved.progress[0].status, 'passed');
    assert.equal(saved.progress[0].passedFingerprint, fingerprint(task));
  } finally { db.close(); }
});

test('fingerprint stale dan lesson belum valid memblokir kelulusan', () => {
  const { db, service } = fixture(false);
  try {
    assert.throws(() => service.saveSession({ ...session(1), fingerprint: `sha256:${'0'.repeat(64)}` }), /Curriculum berubah/);
    assert.throws(() => service.saveSession({ ...session(1), kind: 'passed' }), /Materi valid belum tersedia/);
    assert.equal(service.export().sessions.length, 0);
  } finally { db.close(); }
});

test('ganti task menyimpan draft lama bersama perubahan active task', () => {
  const { db, service } = fixture();
  try {
    const { requestId: _id, revision: _revision, ...previousSession } = session(1);
    const result = service.setActiveTask({ ...envelope(1), taskId: next.taskId, previousSession });
    assert.equal(result.activeTaskId, next.taskId);
    assert.equal(service.export().sessions[0].taskId, task.taskId);
    assert.equal(result.revision, 2);
  } finally { db.close(); }
});

test('kegagalan database setelah insert membatalkan seluruh transaksi', () => {
  const { db, service } = fixture();
  try {
    db.exec("CREATE TRIGGER fail_progress BEFORE INSERT ON task_progress BEGIN SELECT RAISE(ABORT, 'injected failure'); END");
    assert.throws(() => service.saveSession(session(1)), /injected failure/);
    assert.equal(service.snapshot().revision, 1);
    assert.equal(service.export().sessions.length, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS total FROM request_receipts').get() as { total: number }).total, 1);
  } finally { db.close(); }
});

test('restart mempertahankan sesi dan active task dari SQLite disk', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cs101-test-'));
  const path = join(directory, 'learning.sqlite');
  let db = openDatabase(path);
  try {
    let service = new LearningService(db, [task], () => true);
    service.setActiveTask({ ...envelope(0), taskId: task.taskId });
    service.saveSession(session(1));
    db.close();
    db = openDatabase(path);
    service = new LearningService(db, [task], () => true);
    assert.equal(service.snapshot().activeTaskId, task.taskId);
    assert.equal(service.snapshot().progress[0].continueFrom, 'Lanjut latihan 2');
    assert.equal(service.export().sessions.length, 1);
  } finally { db.close(); rmSync(directory, { recursive: true }); }
});
