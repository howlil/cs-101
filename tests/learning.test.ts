import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { initialSchema } from '../migrations/001-initial';
import { curriculumItemFingerprint, type CurriculumManifestV2 } from '../src/domain/curriculum-v2/schema';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { requiredEvidenceForItem } from '../src/domain/learning/rules';
import { openDatabase } from '../src/server/storage';
import { LearningService, LearningError } from '../src/server/learning';

const unitBase = {
  id: 'TEST-001',
  kind: 'unit' as const,
  trackId: 'test',
  moduleId: 'test-core',
  order: 1,
  title: 'Fixture',
  scope: ['mental model'],
  criteria: [{ id: 'predict', text: 'Prediksi hasil' }],
  challenge: { title: 'Jalankan contoh', steps: ['Run'], raw: 'Jalankan contoh\n- Run' },
  prerequisites: [],
  marketExpectation: [],
  source: { title: 'Fixture source' },
  crossModuleReferenceRaw: [],
};

const nextBase = {
  ...unitBase,
  id: 'TEST-002',
  order: 2,
  title: 'Next fixture',
};

const lockedBase = {
  ...unitBase,
  id: 'TEST-003',
  order: 3,
  title: 'Locked fixture',
  prerequisites: ['TEST-001'],
};

const fp = <T extends object>(item: T) => ({
  ...item,
  fingerprint: curriculumItemFingerprint(item),
});

const unit = fp(unitBase);
const next = fp(nextBase);
const locked = fp(lockedBase);

const manifest: CurriculumManifestV2 = {
  version: 2,
  tracks: [{ id: 'test', title: 'Test', order: 1 }],
  modules: [{ id: 'test-core', trackId: 'test', title: 'Test Core', order: 1 }],
  items: [unit, next, locked],
  relations: [
    { from: 'TEST-001', to: 'TEST-003', type: 'prerequisite' },
  ],
};

const graph = buildCurriculumGraph(manifest);
const envelope = (revision: number) => ({ requestId: randomUUID(), revision });

const session = (revision: number) => ({
  ...envelope(revision),
  itemId: unit.id,
  fingerprint: unit.fingerprint,
  kind: 'progress' as const,
  evidence: [],
  continueFrom: 'Lanjut latihan 2',
});

function fixture(ready = true) {
  const db = openDatabase(':memory:');
  const service = new LearningService(db, graph, () => ready);
  service.setActiveItem({ ...envelope(0), itemId: unit.id });
  return { db, service };
}

test('migration V2 backfill active item, progress, dan session item id', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cs101-migration-'));
  const path = join(directory, 'learning.sqlite');
  let db = new DatabaseSync(path);
  try {
    db.exec(initialSchema);
    db.prepare('UPDATE learner_state SET active_task_id=? WHERE id=1').run(unit.id);
    db.prepare(
      "INSERT INTO task_progress(task_id,status,passed_fingerprint,last_anchor,continue_from) VALUES(?,?,?,?,?)",
    ).run(unit.id, 'active', null, 'scope', 'Lanjut');
    db.prepare('INSERT INTO sessions(id,task_id,recorded_at,payload) VALUES(?,?,?,?)')
      .run('session-1', unit.id, new Date(0).toISOString(), JSON.stringify({ taskId: unit.id }));
    db.close();

    db = openDatabase(path);
    const state = db.prepare(
      'SELECT active_item_id AS activeItemId FROM learner_state WHERE id=1',
    ).get() as { activeItemId: string | null };
    const progress = db.prepare(
      'SELECT item_id AS itemId, continue_from AS continueFrom FROM item_progress',
    ).get() as { itemId: string; continueFrom: string };
    const storedSession = db.prepare(
      'SELECT item_id AS itemId FROM sessions WHERE id=?',
    ).get('session-1') as { itemId: string | null };

    assert.equal(state.activeItemId, unit.id);
    assert.equal(progress.itemId, unit.id);
    assert.equal(progress.continueFrom, 'Lanjut');
    assert.equal(storedSession.itemId, unit.id);
    assert.equal(
      (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version,
      2,
    );
  } finally {
    db.close();
    rmSync(directory, { recursive: true });
  }
});

test('retry identik tidak menggandakan sesi, bahkan setelah revision berubah', () => {
  const { db, service } = fixture();
  try {
    const input = session(1);
    const saved = service.saveSession(input);
    assert.equal(saved.revision, 2);
    assert.deepEqual(service.saveSession(input), saved);
    assert.equal(service.export().sessions.length, 1);
    assert.throws(
      () => service.saveSession({ ...input, continueFrom: 'Berbeda' }),
      (error) => error instanceof LearningError && error.status === 409,
    );
  } finally {
    db.close();
  }
});

test('dua tab dengan revision lama mendapat konflik tanpa menulis sesi kedua', () => {
  const { db, service } = fixture();
  try {
    service.saveSession(session(1));
    assert.throws(
      () => service.saveSession(session(1)),
      (error) => error instanceof LearningError && error.status === 409,
    );
    assert.equal(service.export().sessions.length, 1);
  } finally {
    db.close();
  }
});

test('kelulusan membutuhkan evidence semua criteria dan challenge', () => {
  const { db, service } = fixture();
  try {
    assert.throws(
      () => service.saveSession({
        ...session(1),
        kind: 'passed',
        evidence: [{ criterionId: 'predict', text: 'Prediksi' }],
      }),
      /Lengkapi bukti/,
    );

    const evidence = requiredEvidenceForItem(unit).map((criterion) => ({
      criterionId: criterion.id,
      text: 'Evidence',
    }));
    const saved = service.saveSession({
      ...session(1),
      kind: 'passed',
      evidence,
    });

    assert.equal(saved.progress[0].status, 'passed');
    assert.equal(saved.progress[0].passedFingerprint, unit.fingerprint);
    assert.equal(
      saved.availability.find((entry) => entry.itemId === locked.id)?.status,
      'ready',
    );
  } finally {
    db.close();
  }
});

test('hard prerequisite memblokir aktivasi sampai prerequisite passed', () => {
  const { db, service } = fixture();
  try {
    assert.equal(
      service.snapshot().availability.find((entry) => entry.itemId === locked.id)?.status,
      'locked',
    );
    assert.throws(
      () => service.setActiveItem({ ...envelope(1), itemId: locked.id }),
      (error) => error instanceof LearningError && error.status === 422,
    );

    const evidence = requiredEvidenceForItem(unit).map((criterion) => ({
      criterionId: criterion.id,
      text: 'Evidence',
    }));
    const passedState = service.saveSession({
      ...session(1),
      kind: 'passed',
      evidence,
    });
    const activated = service.setActiveItem({
      ...envelope(passedState.revision),
      itemId: locked.id,
    });
    assert.equal(activated.activeItemId, locked.id);
  } finally {
    db.close();
  }
});

test('fingerprint stale dan lesson belum valid memblokir kelulusan', () => {
  const { db, service } = fixture(false);
  try {
    assert.throws(
      () => service.saveSession({
        ...session(1),
        fingerprint: `sha256:${'0'.repeat(64)}`,
      }),
      /Curriculum berubah/,
    );
    assert.throws(
      () => service.saveSession({
        ...session(1),
        kind: 'passed',
        evidence: requiredEvidenceForItem(unit).map((criterion) => ({
          criterionId: criterion.id,
          text: 'Evidence',
        })),
      }),
      /Materi valid belum tersedia/,
    );
    assert.equal(service.export().sessions.length, 0);
  } finally {
    db.close();
  }
});

test('ganti item menyimpan draft lama bersama perubahan active item', () => {
  const { db, service } = fixture();
  try {
    const { requestId: _id, revision: _revision, ...previousSession } = session(1);
    const result = service.setActiveItem({
      ...envelope(1),
      itemId: next.id,
      previousSession,
    });
    assert.equal(result.activeItemId, next.id);
    assert.equal(result.activeTaskId, next.id);
    assert.equal(service.export().sessions[0].itemId, unit.id);
    assert.equal(result.revision, 2);
  } finally {
    db.close();
  }
});

test('dual-write menjaga item_progress dan task_progress sinkron selama compatibility', () => {
  const { db, service } = fixture();
  try {
    service.saveSession(session(1));
    const itemRow = db.prepare(
      'SELECT continue_from AS continueFrom FROM item_progress WHERE item_id=?',
    ).get(unit.id) as { continueFrom: string };
    const taskRow = db.prepare(
      'SELECT continue_from AS continueFrom FROM task_progress WHERE task_id=?',
    ).get(unit.id) as { continueFrom: string };
    assert.equal(itemRow.continueFrom, taskRow.continueFrom);
  } finally {
    db.close();
  }
});

test('kegagalan database setelah insert membatalkan seluruh transaksi', () => {
  const { db, service } = fixture();
  try {
    db.exec(
      "CREATE TRIGGER fail_progress BEFORE INSERT ON item_progress BEGIN SELECT RAISE(ABORT, 'injected failure'); END",
    );
    // Use an item without an existing progress row so INSERT trigger fires.
    assert.throws(
      () => service.setActiveItem({ ...envelope(1), itemId: next.id }),
      /injected failure/,
    );
    assert.equal(service.snapshot().revision, 1);
    assert.equal(service.snapshot().activeItemId, unit.id);
  } finally {
    db.close();
  }
});

test('restart mempertahankan sesi dan active item dari SQLite disk', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cs101-test-'));
  const path = join(directory, 'learning.sqlite');
  let db = openDatabase(path);
  try {
    let service = new LearningService(db, graph, () => true);
    service.setActiveItem({ ...envelope(0), itemId: unit.id });
    service.saveSession(session(1));
    db.close();

    db = openDatabase(path);
    service = new LearningService(db, graph, () => true);
    assert.equal(service.snapshot().activeItemId, unit.id);
    assert.equal(service.snapshot().progress[0].continueFrom, 'Lanjut latihan 2');
    assert.equal(service.export().sessions.length, 1);
  } finally {
    db.close();
    rmSync(directory, { recursive: true });
  }
});
