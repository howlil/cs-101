import { test } from 'node:test';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { CloudflareLearningService, type D1Database } from '../src/server/learning/d1';
import assert from 'node:assert/strict';
import { curriculumItemFingerprint } from '../src/domain/curriculum-v2/schema';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import {
  chooseAssessmentPlan, gradeAssessment, nextCompetencyReview, publicQuestion,
} from '../src/domain/learning/assessment';
import { assessmentQuestion, assessmentQuestionsForItem } from '../src/server/assessment-bank';
import { LearningService, LearningError } from '../src/server/learning/sqlite';
import { openDatabase } from '../src/server/storage';

const itemBase = {
  id: 'SQL-001', kind: 'unit' as const, trackId: 'sql', moduleId: 'sql-core',
  order: 1, title: 'SQL NULL', scope: ['NULL'],
  criteria: [{ id: 'c1', text: 'Predict NULL' }],
  challenge: { title: 'Predict', raw: 'Predict', steps: ['Try'] },
  prerequisites: [], marketExpectation: [], source: { title: 'Reference' },
  crossModuleReferenceRaw: [],
};
const item = { ...itemBase, fingerprint: curriculumItemFingerprint(itemBase) };
const graph = buildCurriculumGraph({
  version: 2,
  tracks: [{ id: 'sql', title: 'SQL', order: 1 }],
  modules: [{ id: 'sql-core', trackId: 'sql', title: 'SQL Core', order: 1 }],
  items: [item], relations: [],
});

test('public assessment never sends answer key and misconception map', () => {
  const q = assessmentQuestion('sql-null-predict-01')!;
  const view = publicQuestion(q);
  assert.equal('answer' in view, false);
  assert.equal('misconceptions' in view, false);
  assert.equal(gradeAssessment(q, 0).correct, false);
  assert.equal(gradeAssessment(q, 1).correct, true);
  assert.throws(() => gradeAssessment(q, 9), /Jawaban/);
});

test('review scheduling follows correct retrieval, without retry punishment', () => {
  const now = new Date('2026-10-15T00:00:00Z');
  assert.equal(nextCompetencyReview(undefined, 'practice', false, now), undefined);
  const start = nextCompetencyReview(undefined, 'practice', true, now)!;
  assert.equal(start.dueAt, '2026-10-16T00:00:00.000Z');
  assert.equal(nextCompetencyReview(start, 'practice', true, now), undefined);
  const next = nextCompetencyReview(start, 'recall', true, now)!;
  assert.equal(next.dueAt, '2026-10-18T00:00:00.000Z');
  const reset = nextCompetencyReview(next, 'recall', false, now)!;
  assert.equal(reset.step, 0);
  const selected = chooseAssessmentPlan('SQL-001', assessmentQuestionsForItem('SQL-001'),
    true, start, new Date('2026-10-16T00:00:00Z'));
  assert.equal(selected.kind, 'recall');
});

test('SQLite assessment is idempotent, versioned, and never self-certifies completion', () => {
  const db = openDatabase(':memory:');
  let clock = new Date('2026-10-15T00:00:00Z');
  const service = new LearningService(db, graph, undefined, () => clock);
  const input = {
    requestId: '00000000-0000-4000-8000-000000000901',
    revision: 0, itemId: 'SQL-001', assessmentId: 'sql-null-predict-01',
    assessmentVersion: 'v1', phase: 'practice' as const, answer: 1,
  };
  try {
    assert.equal(service.assessmentPlan(item.id).kind, 'practice');
    assert.equal(service.submitAssessment(input).assessment.correct, true);
    assert.equal(service.submitAssessment(input).revision, 1);
    assert.equal(service.assessmentPlan(item.id).kind, 'waiting');
    assert.equal(service.snapshot().progress.length, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM competency_attempts').get() as {count:number}).count, 1);
    assert.throws(() => service.submitAssessment({ ...input, answer: 0 }), (e: unknown) =>
      e instanceof LearningError && e.status === 409);
    assert.throws(() => service.submitAssessment({
      ...input, requestId: '00000000-0000-4000-8000-000000000902',
      revision: 1, assessmentVersion: 'wrong',
    }), (e: unknown) => e instanceof LearningError && e.status === 409);
    clock = new Date('2026-10-16T00:00:00Z');
    assert.equal(service.assessmentPlan(item.id).kind, 'recall');
    const recall = service.submitAssessment({
      ...input, requestId: '00000000-0000-4000-8000-000000000903',
      revision: 1, assessmentId: 'sql-null-recall-01', phase: 'recall', answer: 0,
    });
    assert.equal(recall.assessment.correct, false);
    assert.equal(service.assessmentPlan(item.id).kind, 'waiting');
    assert.equal(service.snapshot().progress.length, 0);
  } finally { db.close(); }
});

type BoundStatement = {
  sql: string;
  values: SQLInputValue[];
  bind(...values: unknown[]): BoundStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[]; success: boolean }>;
  run(): Promise<{ results: Record<string, unknown>[]; success: boolean }>;
};

function sqliteD1(db: DatabaseSync): D1Database {
  const make = (sql: string, values: SQLInputValue[] = []): BoundStatement => ({
    sql,
    values,
    bind: (...next) => make(sql, next as SQLInputValue[]),
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


test('Cloudflare D1 and SQLite assessment mutations agree across retry and delayed recall', async () => {
  const sqliteDb = openDatabase(':memory:');
  const d1Db = openDatabase(':memory:');
  d1Db.exec("ALTER TABLE request_receipts ADD COLUMN nonce TEXT NOT NULL DEFAULT ''");
  let now = new Date('2026-10-15T00:00:00Z');
  const local = new LearningService(sqliteDb, graph, undefined, () => now);
  const cloud = new CloudflareLearningService(sqliteD1(d1Db), graph, undefined, () => now);
  const input = {
    requestId: '00000000-0000-4000-8000-000000000905',
    revision: 0, itemId: 'SQL-001', assessmentId: 'sql-null-predict-01',
    assessmentVersion: 'v1', phase: 'practice' as const, answer: 1,
  };
  try {
    assert.deepEqual(await cloud.assessmentPlan(item.id), local.assessmentPlan(item.id));
    assert.deepEqual(await cloud.submitAssessment(input), local.submitAssessment(input));
    assert.deepEqual(await cloud.submitAssessment(input), local.submitAssessment(input));
    assert.equal((d1Db.prepare('SELECT COUNT(*) AS count FROM competency_attempts').get() as {count:number}).count, 1);
    now = new Date('2026-10-16T00:00:00Z');
    assert.deepEqual(await cloud.assessmentPlan(item.id), local.assessmentPlan(item.id));
    const recall = {
      ...input, requestId: '00000000-0000-4000-8000-000000000906',
      revision: 1, assessmentId: 'sql-null-recall-01', phase: 'recall' as const, answer: 1,
    };
    assert.deepEqual(await cloud.submitAssessment(recall), local.submitAssessment(recall));
    assert.deepEqual(await cloud.assessmentPlan(item.id), local.assessmentPlan(item.id));
    assert.deepEqual(await cloud.snapshot(), local.snapshot());
  } finally { sqliteDb.close(); d1Db.close(); }
});
