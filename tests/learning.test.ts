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
import { reviewBankSchema } from '../src/domain/review/schema';
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

const projectBase = {
  id: 'TEST-P01',
  kind: 'checkpoint' as const,
  trackId: 'test',
  moduleId: 'test-core',
  order: 4,
  title: 'Project fixture',
  problemStatement: 'Build the project',
  requirements: [{ id: 'project-proof', text: 'Project invariant terbukti' }],
  prerequisites: ['TEST-001'],
  source: { title: 'Fixture source' },
};

const nextProjectBase = {
  ...projectBase,
  id: 'TEST-P02',
  order: 5,
  title: 'Next project fixture',
  parentProjectId: 'TEST-P01',
  requirements: [
    { id: 'inherit', text: 'Includes every Project 1 requirement' },
    { id: 'project-proof-2', text: 'New invariant terbukti' },
  ],
  prerequisites: ['TEST-001'],
};

const project = fp(projectBase);
const nextProject = fp(nextProjectBase);

const integrationBase = {
  id: 'INT-001',
  kind: 'integration' as const,
  order: 1,
  title: 'Cross-track fixture',
  brief: 'Combine two foundations',
  scope: ['Combine TEST-001 and TEST-002'],
  challenge: {
    title: 'Prove the integration',
    steps: ['Run integrated flow'],
    raw: 'Prove the integration',
  },
  criteria: [{ id: 'integration-proof', text: 'Integrated flow works' }],
  requirements: [{ id: 'integration-artifact', text: 'Evidence transcript' }],
  prerequisites: ['TEST-001', 'TEST-002'],
  source: { title: 'Fixture source' },
};

const integration = fp(integrationBase);

const manifest: CurriculumManifestV2 = {
  version: 2,
  tracks: [{ id: 'test', title: 'Test', order: 1 }],
  modules: [{ id: 'test-core', trackId: 'test', title: 'Test Core', order: 1 }],
  items: [unit, next, locked, project, nextProject, integration],
  relations: [
    { from: 'TEST-001', to: 'TEST-003', type: 'prerequisite' },
    { from: 'TEST-001', to: 'TEST-P01', type: 'prerequisite' },
    { from: 'TEST-001', to: 'TEST-P01', type: 'contributes_to' },
    { from: 'TEST-001', to: 'TEST-P02', type: 'prerequisite' },
    { from: 'TEST-P01', to: 'TEST-P02', type: 'project_parent' },
    { from: 'TEST-001', to: 'INT-001', type: 'prerequisite' },
    { from: 'TEST-002', to: 'INT-001', type: 'prerequisite' },
    { from: 'TEST-001', to: 'INT-001', type: 'related' },
    { from: 'TEST-002', to: 'INT-001', type: 'deep_dive' },
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
      3,
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

test('hambatan saja cukup untuk menyimpan sesi progress', () => {
  const { db, service } = fixture();
  try {
    const saved = service.saveSession({
      ...session(1),
      continueFrom: '',
      blocker: 'Masih bingung NULL + NOT IN',
    });
    assert.equal(saved.revision, 2);
    const exported = service.export().sessions[0] as { blocker?: string };
    assert.equal(exported.blocker, 'Masih bingung NULL + NOT IN');
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

test('fingerprint stale memblokir, tetapi lesson MDX bukan syarat kelulusan', () => {
  const { db, service } = fixture(false);
  try {
    assert.throws(
      () => service.saveSession({
        ...session(1),
        fingerprint: `sha256:${'0'.repeat(64)}`,
      }),
      /Curriculum berubah/,
    );

    const saved = service.saveSession({
      ...session(1),
      kind: 'passed',
      evidence: requiredEvidenceForItem(unit).map((criterion) => ({
        criterionId: criterion.id,
        text: 'Evidence',
      })),
    });
    assert.equal(saved.progress.find((entry) => entry.itemId === unit.id)?.status, 'passed');
    assert.equal(service.export().sessions.length, 1);
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

test('passed fingerprint lama menjadi stale dan tidak membuka prerequisite', () => {
  const db = openDatabase(':memory:');
  try {
    db.prepare('INSERT INTO item_progress(item_id,status,passed_fingerprint,last_anchor,continue_from) VALUES(?,?,?,?,?)')
      .run(unit.id, 'passed', `sha256:${'0'.repeat(64)}`, '', '');
    const service = new LearningService(db, graph, () => true);
    const snapshot = service.snapshot();
    assert.equal(snapshot.progress.find((entry) => entry.itemId === unit.id)?.status, 'stale');
    assert.equal(
      snapshot.availability.find((entry) => entry.itemId === locked.id)?.status,
      'locked',
    );
  } finally {
    db.close();
  }
});


test('checkpoint mengikuti locked → ready → active → passed dan membuka project berikutnya', () => {
  const { db: blockedDb, service } = fixture(false);
  try {
    assert.equal(
      service.snapshot().availability.find((entry) => entry.itemId === project.id)?.status,
      'locked',
    );

    const unitEvidence = requiredEvidenceForItem(unit).map((criterion) => ({
      criterionId: criterion.id,
      text: 'Evidence unit',
    }));
    // Unit completion still requires lesson readiness; this fixture intentionally disables it.
    assert.throws(
      () => service.saveSession({
        ...session(1),
        kind: 'passed',
        evidence: unitEvidence,
      }),
      /Materi valid belum tersedia/,
    );
  } finally {
    blockedDb.close();
  }

  const db = openDatabase(':memory:');
  try {
    const service = new LearningService(db, graph, () => true);
    service.setActiveItem({ ...envelope(0), itemId: unit.id });
    const unitEvidence = requiredEvidenceForItem(unit).map((criterion) => ({
      criterionId: criterion.id,
      text: 'Evidence unit',
    }));
    const unitPassed = service.saveSession({
      ...session(1),
      kind: 'passed',
      evidence: unitEvidence,
    });

    assert.equal(
      unitPassed.availability.find((entry) => entry.itemId === project.id)?.status,
      'ready',
    );

    const activated = service.setActiveItem({
      ...envelope(unitPassed.revision),
      itemId: project.id,
    });
    assert.equal(activated.activeItemId, project.id);

    const projectEvidence = requiredEvidenceForItem(project).map((criterion) => ({
      criterionId: criterion.id,
      text: 'Project evidence',
    }));
    const completed = service.saveSession({
      ...envelope(activated.revision),
      itemId: project.id,
      fingerprint: project.fingerprint,
      kind: 'passed',
      evidence: projectEvidence,
      continueFrom: '',
      lastAnchor: '',
    });

    assert.equal(
      completed.progress.find((entry) => entry.itemId === project.id)?.status,
      'passed',
    );
    assert.equal(
      completed.availability.find((entry) => entry.itemId === nextProject.id)?.status,
      'ready',
    );
  } finally {
    db.close();
  }
});


test('parent checkpoint memblokir project berikutnya walau explicit prerequisite sudah passed', () => {
  const db = openDatabase(':memory:');
  try {
    const service = new LearningService(db, graph, () => true);

    // TEST-001 adalah explicit prerequisite TEST-P02, tetapi parent TEST-P01 belum passed.
    service.setActiveItem({ ...envelope(0), itemId: unit.id });
    const unitEvidence = requiredEvidenceForItem(unit).map((criterion) => ({
      criterionId: criterion.id,
      text: 'Evidence unit',
    }));
    const unitPassed = service.saveSession({
      ...session(1),
      kind: 'passed',
      evidence: unitEvidence,
    });

    const availability = unitPassed.availability.find((entry) => entry.itemId === nextProject.id);
    assert.equal(availability?.status, 'locked');
    assert.deepEqual(availability?.missingPrerequisites, ['TEST-P01']);
  } finally {
    db.close();
  }
});


test('integration menunggu semua hard prerequisite lalu dapat diselesaikan tanpa lesson MDX', () => {
  const db = openDatabase(':memory:');
  try {
    const service = new LearningService(db, graph, () => true);

    service.setActiveItem({ ...envelope(0), itemId: unit.id });
    const unitEvidence = requiredEvidenceForItem(unit).map((criterion) => ({
      criterionId: criterion.id,
      text: 'Evidence unit',
    }));
    const firstPassed = service.saveSession({
      ...session(1),
      kind: 'passed',
      evidence: unitEvidence,
    });

    const afterFirst = firstPassed.availability.find((entry) => entry.itemId === integration.id);
    assert.equal(afterFirst?.status, 'locked');
    assert.deepEqual(afterFirst?.missingPrerequisites, ['TEST-002']);

    const nextActive = service.setActiveItem({
      ...envelope(firstPassed.revision),
      itemId: next.id,
    });
    const nextEvidence = requiredEvidenceForItem(next).map((criterion) => ({
      criterionId: criterion.id,
      text: 'Evidence second unit',
    }));
    const secondPassed = service.saveSession({
      ...envelope(nextActive.revision),
      itemId: next.id,
      fingerprint: next.fingerprint,
      kind: 'passed',
      evidence: nextEvidence,
      continueFrom: '',
      lastAnchor: '',
    });

    assert.equal(
      secondPassed.availability.find((entry) => entry.itemId === integration.id)?.status,
      'ready',
    );

    const integrationActive = service.setActiveItem({
      ...envelope(secondPassed.revision),
      itemId: integration.id,
    });
    const integrationEvidence = requiredEvidenceForItem(integration).map((criterion) => ({
      criterionId: criterion.id,
      text: 'Integration evidence',
    }));
    const completed = service.saveSession({
      ...envelope(integrationActive.revision),
      itemId: integration.id,
      fingerprint: integration.fingerprint,
      kind: 'passed',
      evidence: integrationEvidence,
      continueFrom: '',
      lastAnchor: '',
    });

    assert.equal(
      completed.progress.find((entry) => entry.itemId === integration.id)?.status,
      'passed',
    );
  } finally {
    db.close();
  }
});


test('item passed membuat review schedule dan due state berasal dari waktu', () => {
  const db = openDatabase(':memory:');
  let clock = new Date('2026-10-07T00:00:00.000Z');
  try {
    const service = new LearningService(db, graph, () => true, () => undefined, () => clock);
    service.setActiveItem({ ...envelope(0), itemId: unit.id });
    const evidence = requiredEvidenceForItem(unit).map((criterion) => ({
      criterionId: criterion.id,
      text: 'Evidence',
    }));
    const passedState = service.saveSession({
      ...session(1),
      kind: 'passed',
      evidence,
    });

    const scheduled = passedState.reviews.find((entry) => entry.itemId === unit.id);
    assert.equal(scheduled?.state, 'scheduled');
    assert.equal(scheduled?.dueAt, '2026-10-08T00:00:00.000Z');

    clock = new Date('2026-10-08T00:00:01.000Z');
    assert.equal(
      service.snapshot().reviews.find((entry) => entry.itemId === unit.id)?.state,
      'due',
    );
  } finally {
    db.close();
  }
});

test('assisted review 5/5 menjadi retry; unassisted pass maju interval dan completion tetap passed', () => {
  const db = openDatabase(':memory:');
  let clock = new Date('2026-10-07T00:00:00.000Z');
  const bank = reviewBankSchema.parse({
    itemId: unit.id,
    version: 'unit-review-v1',
    curriculumFingerprint: unit.fingerprint,
    questions: Array.from({ length: 5 }, (_, index) => ({
      id: 'q' + (index + 1),
      prompt: 'Question ' + (index + 1),
      options: ['correct', 'wrong'],
      answer: 0,
      explanation: 'Because.',
      criterionIds: ['predict'],
    })),
  });

  try {
    const service = new LearningService(
      db,
      graph,
      () => true,
      (itemId) => itemId === unit.id ? bank : undefined,
      () => clock,
    );

    service.setActiveItem({ ...envelope(0), itemId: unit.id });
    const evidence = requiredEvidenceForItem(unit).map((criterion) => ({
      criterionId: criterion.id,
      text: 'Evidence',
    }));
    const passedState = service.saveSession({
      ...session(1),
      kind: 'passed',
      evidence,
    });

    clock = new Date('2026-10-08T00:00:01.000Z');
    const assisted = service.submitReview({
      requestId: randomUUID(),
      revision: passedState.revision,
      itemId: unit.id,
      questionSetVersion: bank.version,
      answers: [0, 0, 0, 0, 0],
      assisted: true,
    });

    assert.equal(assisted.reviewAttempt?.score, 5);
    assert.equal(assisted.reviewAttempt?.result, 'again');
    assert.equal(assisted.reviews.find((entry) => entry.itemId === unit.id)?.state, 'retry');
    assert.equal(assisted.progress.find((entry) => entry.itemId === unit.id)?.status, 'passed');

    const passedReview = service.submitReview({
      requestId: randomUUID(),
      revision: assisted.revision,
      itemId: unit.id,
      questionSetVersion: bank.version,
      answers: [0, 0, 0, 0, 1],
      assisted: false,
    });

    assert.equal(passedReview.reviewAttempt?.score, 4);
    assert.equal(passedReview.reviewAttempt?.result, 'passed');
    assert.equal(passedReview.reviews.find((entry) => entry.itemId === unit.id)?.state, 'scheduled');
    assert.equal(passedReview.reviews.find((entry) => entry.itemId === unit.id)?.step, 1);
    assert.equal(passedReview.reviews.find((entry) => entry.itemId === unit.id)?.dueAt, '2026-10-11T00:00:01.000Z');
    assert.equal(passedReview.progress.find((entry) => entry.itemId === unit.id)?.status, 'passed');

    const exported = service.export();
    assert.equal(exported.reviewAttempts.length, 2);
    assert.deepEqual(exported.reviewAttempts.map((attempt) => attempt.result), ['again', 'passed']);
  } finally {
    db.close();
  }
});

test('review tidak boleh dilakukan sebelum due, tanpa bank, atau ketika completion stale', () => {
  const db = openDatabase(':memory:');
  let clock = new Date('2026-10-07T00:00:00.000Z');
  const bank = reviewBankSchema.parse({
    itemId: unit.id,
    version: 'unit-review-v1',
    curriculumFingerprint: unit.fingerprint,
    questions: Array.from({ length: 5 }, (_, index) => ({
      id: 'q' + (index + 1),
      prompt: 'Question ' + (index + 1),
      options: ['correct', 'wrong'],
      answer: 0,
      explanation: 'Because.',
      criterionIds: [],
    })),
  });

  try {
    const service = new LearningService(db, graph, () => true, () => bank, () => clock);
    service.setActiveItem({ ...envelope(0), itemId: unit.id });
    const evidence = requiredEvidenceForItem(unit).map((criterion) => ({
      criterionId: criterion.id,
      text: 'Evidence',
    }));
    const passed = service.saveSession({ ...session(1), kind: 'passed', evidence });

    assert.throws(
      () => service.submitReview({
        requestId: randomUUID(),
        revision: passed.revision,
        itemId: unit.id,
        questionSetVersion: bank.version,
        answers: [0, 0, 0, 0, 0],
        assisted: false,
      }),
      /belum jatuh tempo/,
    );

    db.prepare('UPDATE item_progress SET passed_fingerprint=? WHERE item_id=?')
      .run('sha256:' + '0'.repeat(64), unit.id);
    clock = new Date('2026-10-09T00:00:00.000Z');

    assert.throws(
      () => service.submitReview({
        requestId: randomUUID(),
        revision: passed.revision,
        itemId: unit.id,
        questionSetVersion: bank.version,
        answers: [0, 0, 0, 0, 0],
        assisted: false,
      }),
      /sudah lulus dan tidak stale/,
    );
  } finally {
    db.close();
  }
});
