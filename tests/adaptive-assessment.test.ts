import { test } from 'node:test';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { CloudflareLearningService, type D1Database } from '../src/server/learning/d1';
import assert from 'node:assert/strict';
import { curriculumGraph } from '../src/server/curriculum';
import {
  chooseAssessmentPlan, gradeAssessment, nextCompetencyReview, publicQuestion,
} from '../src/domain/learning/assessment';
import { assessmentQuestion, assessmentQuestionsForItem } from '../src/server/assessment-bank';
import { LearningService, LearningError } from '../src/server/learning/sqlite';
import { openDatabase } from '../src/server/storage';

const graph = curriculumGraph;
const item = graph.itemsById.get('SQL-001')!;

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

test('incorrect prediction routes to fresh transfer without activation; stale revision is rejected', () => {
  const db = openDatabase(':memory:');
  const service = new LearningService(db, graph);
  const first = {
    requestId: '00000000-0000-4000-8000-000000000911',
    revision: 0, itemId: item.id, phase: 'practice' as const,
    assessmentId: 'sql-null-predict-01', assessmentVersion: 'v1', answer: 0,
  };
  try {
    const attempt = service.submitAssessment(first);
    assert.equal(attempt.assessment.correct, false);
    assert.equal(attempt.revision, 1);
    assert.equal(service.assessmentPlan(item.id).kind, 'transfer');
    assert.throws(() => service.submitAssessment({
      ...first, requestId: '00000000-0000-4000-8000-000000000912', answer: 1,
    }), (e: unknown) => e instanceof LearningError && e.status === 409);
    const retry = service.submitAssessment({
      ...first, requestId: '00000000-0000-4000-8000-000000000913', revision: 1,
      phase: 'transfer', assessmentId: 'sql-null-transfer-01', answer: 1,
    });
    assert.equal(retry.assessment.outcome, 'correct_unassisted');
    assert.equal(service.assessmentPlan(item.id).kind, 'waiting');
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM competency_attempts').get() as {count:number}).count, 2);
  } finally { db.close(); }
});

test('feedback on the same question is not independent evidence', () => {
  const q = assessmentQuestion('sql-null-predict-01')!;
  const previous = [{ assessmentId: q.id, phase: 'practice' as const, correct: false,
    outcome: 'incorrect' as const }];
  assert.equal(gradeAssessment(q, 1, previous).outcome, 'correct_after_feedback');
  const afterFailure = chooseAssessmentPlan(q.itemId, assessmentQuestionsForItem(q.itemId),
    false, undefined, new Date(), previous);
  assert.equal(afterFailure.kind, 'transfer');
});

test('v6 export carries independent assessment attempts and schedule in SQLite', () => {
  const db = openDatabase(':memory:');
  try {
    const service = new LearningService(db, graph);
    service.submitAssessment({
      requestId: '00000000-0000-4000-8000-000000000915', revision: 0,
      itemId: 'SQL-001', phase: 'practice', assessmentId: 'sql-null-predict-01',
      assessmentVersion: 'v1', answer: 1,
    });
    const data = service.export();
    assert.equal(data.version, 5);
    assert.equal(data.competencyAttempts.length, 1);
    assert.equal(data.competencyReviewSchedules.length, 1);
    assert.equal((data.competencyAttempts[0] as { outcome: string }).outcome, 'correct_unassisted');
    assert.equal((db.prepare('PRAGMA user_version').get() as {user_version:number}).user_version, 6);
  } finally { db.close(); }
});
