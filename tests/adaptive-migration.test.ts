import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initialSchema } from '../migrations/001-initial';
import { learningItemsMigration } from '../migrations/002-learning-items';
import { reviewMigration } from '../migrations/003-review';
import { studyProgressMigration } from '../migrations/004-study-progress';
import { adaptiveAssessmentMigration } from '../migrations/005-adaptive-assessment';
import { openDatabase } from '../src/server/storage';

test('v5→v6 migration preserves legacy attempts and permits new transfer attempts', () => {
  const folder = mkdtempSync(join(tmpdir(), 'cs101-adaptive-'));
  const file = join(folder, 'progress.sqlite');
  let db: DatabaseSync | undefined;
  try {
    db = new DatabaseSync(file);
    db.exec('BEGIN IMMEDIATE');
    for (const migration of [initialSchema, learningItemsMigration, reviewMigration,
      studyProgressMigration, adaptiveAssessmentMigration]) db.exec(migration);
    db.exec('COMMIT');
    db.prepare(`INSERT INTO competency_attempts
      (id,request_id,item_id,competency_id,assessment_id,assessment_version,phase,answer_index,correct,recorded_at)
      VALUES(?,?,?,?,?,?,?,?,?,?)`).run('old-1', 'old-request', 'SQL-001', 'sql-001-null-logic',
        'sql-null-predict-01', 'v1', 'practice', 1, 1, '2026-10-15T00:00:00.000Z');
    db.close();
    db = openDatabase(file);
    assert.equal((db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version, 6);
    const old = db.prepare('SELECT outcome, bank_fingerprint AS bankFingerprint FROM competency_attempts WHERE id=?')
      .get('old-1') as { outcome: string; bankFingerprint: string | null };
    assert.deepEqual(old, { outcome: 'legacy_unknown', bankFingerprint: null });
    db.prepare(`INSERT INTO competency_attempts
      (id,request_id,item_id,competency_id,assessment_id,assessment_version,phase,answer_index,correct,recorded_at,outcome,bank_fingerprint)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run('new-1', 'new-request', 'SQL-001', 'sql-001-null-logic',
        'sql-null-transfer-01', 'v1', 'transfer', 1, 1, '2026-10-16T00:00:00.000Z',
        'correct_unassisted', 'sha256:test');
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM competency_attempts').get() as {count:number}).count, 2);
  } finally { db?.close(); rmSync(folder, { recursive: true, force: true }); }
});
