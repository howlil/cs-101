import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

import { curriculumItemFingerprint, type CurriculumManifestV2 } from '../src/domain/curriculum-v2/schema';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { requiredEvidenceForItem } from '../src/domain/learning/rules';
import { reviewBankSchema } from '../src/domain/review/schema';
import { LearningService } from '../src/server/learning';
import { CloudflareLearningService, type D1Database } from '../src/server/cloudflare-learning';
import { openDatabase } from '../src/server/storage';

const fp = <T extends object>(item: T) => ({
  ...item,
  fingerprint: curriculumItemFingerprint(item),
});

const first = fp({
  id: 'PAR-001',
  kind: 'unit' as const,
  trackId: 'parity',
  moduleId: 'parity-core',
  order: 1,
  title: 'Parity one',
  scope: ['one'],
  criteria: [{ id: 'c1', text: 'Criterion one' }],
  challenge: { title: 'Challenge one', steps: ['Run'], raw: 'Challenge one' },
  prerequisites: [],
  marketExpectation: [],
  source: { title: 'Fixture', url: 'https://example.com/one' },
  crossModuleReferenceRaw: [],
});

const second = fp({
  ...first,
  id: 'PAR-002',
  order: 2,
  title: 'Parity two',
  scope: ['two'],
  criteria: [{ id: 'c2', text: 'Criterion two' }],
  challenge: { title: 'Challenge two', steps: ['Run'], raw: 'Challenge two' },
  prerequisites: ['PAR-001'],
  source: { title: 'Fixture', url: 'https://example.com/two' },
});

const manifest: CurriculumManifestV2 = {
  version: 2,
  tracks: [{ id: 'parity', title: 'Parity', order: 1 }],
  modules: [{ id: 'parity-core', trackId: 'parity', title: 'Parity Core', order: 1 }],
  items: [first, second],
  relations: [{ from: 'PAR-001', to: 'PAR-002', type: 'prerequisite' }],
};

const graph = buildCurriculumGraph(manifest);

type BoundStatement = {
  sql: string;
  values: unknown[];
  bind(...values: unknown[]): BoundStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[]; success: boolean }>;
  run(): Promise<{ results: Record<string, unknown>[]; success: boolean }>;
};

function sqliteD1(db: DatabaseSync): D1Database {
  const make = (sql: string, values: unknown[] = []): BoundStatement => ({
    sql,
    values,
    bind: (...next) => make(sql, next),
    async first<T>() {
      return (db.prepare(sql).get(...values) as T | undefined) ?? null;
    },
    async all<T>() {
      return {
        results: db.prepare(sql).all(...values) as T[],
        success: true,
      };
    },
    async run() {
      db.prepare(sql).run(...values);
      return { results: [], success: true };
    },
  });

  return {
    prepare(query: string) {
      return make(query) as never;
    },
    async batch(statements) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const results = [];
        for (const raw of statements as unknown as BoundStatement[]) {
          const sql = raw.sql.trim();
          if (/^(SELECT|PRAGMA|WITH)\b/i.test(sql)) {
            results.push({
              results: db.prepare(raw.sql).all(...raw.values),
              success: true,
            });
          } else {
            db.prepare(raw.sql).run(...raw.values);
            results.push({ results: [], success: true });
          }
        }
        db.exec('COMMIT');
        return results;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  } as D1Database;
}

function snapshotShape(snapshot: Awaited<ReturnType<CloudflareLearningService['snapshot']>>) {
  return {
    activeItemId: snapshot.activeItemId,
    activeTaskId: snapshot.activeTaskId,
    revision: snapshot.revision,
    progress: [...snapshot.progress].sort((a, b) => a.itemId.localeCompare(b.itemId)),
    availability: [...snapshot.availability].sort((a, b) => a.itemId.localeCompare(b.itemId)),
    reviews: [...snapshot.reviews].sort((a, b) => a.itemId.localeCompare(b.itemId)),
  };
}

test('SQLite dan D1 service menjaga contract state yang sama', async () => {
  const localDb = openDatabase(':memory:');
  const d1Db = openDatabase(':memory:');
  let clock = new Date('2026-10-07T00:00:00.000Z');

  const bank = reviewBankSchema.parse({
    itemId: first.id,
    version: 'parity-review-v1',
    curriculumFingerprint: first.fingerprint,
    questions: Array.from({ length: 5 }, (_, index) => ({
      id: 'q' + (index + 1),
      prompt: 'Question ' + (index + 1),
      options: ['correct', 'wrong'],
      answer: 0,
      explanation: 'Because.',
      criterionIds: ['c1'],
    })),
  });

  const bankFor = (itemId: string) => itemId === first.id ? bank : undefined;
  const local = new LearningService(localDb, graph, () => true, bankFor, () => clock);
  const cloud = new CloudflareLearningService(
    sqliteD1(d1Db),
    graph,
    () => true,
    bankFor,
    () => clock,
  );

  const compare = async () => {
    assert.deepEqual(
      snapshotShape(await cloud.snapshot()),
      snapshotShape(local.snapshot()),
    );
  };

  try {
    await compare();

    const activateOne = {
      requestId: '00000000-0000-4000-8000-000000000101',
      revision: 0,
      itemId: first.id,
    };
    local.setActiveItem(activateOne);
    await cloud.setActiveItem(activateOne);
    await compare();

    const evidence = requiredEvidenceForItem(first).map((criterion) => ({
      criterionId: criterion.id,
      text: 'Evidence ' + criterion.id,
    }));
    const passOne = {
      requestId: '00000000-0000-4000-8000-000000000102',
      revision: 1,
      itemId: first.id,
      fingerprint: first.fingerprint,
      kind: 'passed' as const,
      evidence,
      continueFrom: '',
      lastAnchor: '',
    };
    local.saveSession(passOne);
    await cloud.saveSession(passOne);
    await compare();

    // Exact retries must return the same state without advancing revision.
    assert.equal(local.saveSession(passOne).revision, 2);
    assert.equal((await cloud.saveSession(passOne)).revision, 2);
    await compare();

    const activateTwo = {
      requestId: '00000000-0000-4000-8000-000000000103',
      revision: 2,
      itemId: second.id,
    };
    local.setActiveItem(activateTwo);
    await cloud.setActiveItem(activateTwo);
    await compare();

    clock = new Date('2026-10-08T00:00:01.000Z');
    await compare();

    const review = {
      requestId: '00000000-0000-4000-8000-000000000104',
      revision: 3,
      itemId: first.id,
      questionSetVersion: bank.version,
      answers: [0, 0, 0, 0, 1],
      assisted: false,
    };
    const localReview = local.submitReview(review);
    const cloudReview = await cloud.submitReview(review);
    assert.deepEqual(cloudReview.reviewAttempt, localReview.reviewAttempt);
    assert.deepEqual(cloudReview.reviewFeedback, localReview.reviewFeedback);
    await compare();
  } finally {
    localDb.close();
    d1Db.close();
  }
});
