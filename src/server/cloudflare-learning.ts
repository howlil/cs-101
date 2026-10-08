import { createHash, randomUUID } from 'node:crypto';
import type { CurriculumGraph } from '../domain/curriculum-v2/graph';
import {
  deriveAvailability,
  requiredEvidenceForItem,
  withCurrentCompletion,
  type ItemProgressState,
} from '../domain/learning/rules';
import {
  activeItemSchema,
  reviewAttemptSchema,
  sessionSchema,
  type SessionFields,
} from '../domain/learning/schema';
import {
  advanceReviewSchedule,
  gradeReview,
  initialReviewSchedule,
  toReviewView,
  type ReviewScheduleRow,
  type ReviewScheduleView,
} from '../domain/review/policy';
import type { ReviewBank } from '../domain/review/schema';
import { LearningError, type LearningSnapshot } from './learning';

type D1Row = Record<string, unknown>;
type D1Result<T = D1Row> = { results: T[]; success: boolean };
type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  first<T = D1Row>(): Promise<T | null>;
  all<T = D1Row>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
};
export type D1Database = {
  prepare(query: string): D1Statement;
  batch<T extends D1Statement[]>(statements: T): Promise<D1Result[]>;
};

type StateRow = { activeItemId: string | null; revision: number };
type StoredReceipt = { payload_hash: string; response: string; nonce: string };
type StoredReviewRow = {
  itemId: string;
  policyVersion: string;
  step: number;
  dueAt: string | null;
  storedState: ReviewScheduleRow['storedState'];
};

function storedFromView(view: ReviewScheduleView): ReviewScheduleRow {
  return {
    itemId: view.itemId,
    policyVersion: view.policyVersion,
    step: view.step,
    dueAt: view.dueAt,
    storedState:
      view.state === 'retry'
        ? 'retry'
        : view.state === 'retained'
          ? 'retained'
          : 'scheduled',
  };
}

export class CloudflareLearningService {
  constructor(
    private db: D1Database,
    private graph: CurriculumGraph,
    private reviewBankFor: (itemId: string) => ReviewBank | undefined = () => undefined,
    private now: () => Date = () => new Date(),
  ) {}

  async snapshot(): Promise<LearningSnapshot> {
    const [stateResult, progressResult, reviewResult] = await this.db.batch([
      this.db.prepare('SELECT active_item_id AS activeItemId, revision FROM learner_state WHERE id=1'),
      this.db.prepare('SELECT item_id AS itemId, status, passed_fingerprint AS passedFingerprint, last_anchor AS lastAnchor, continue_from AS continueFrom FROM item_progress'),
      this.db.prepare(`SELECT item_id AS itemId, policy_version AS policyVersion, step,
        due_at AS dueAt, state AS storedState FROM review_schedule`),
    ]);
    const state = stateResult.results[0] as StateRow | undefined;
    if (!state) throw new Error('Database progres belum dimigrasikan.');
    const rows = progressResult.results as ItemProgressState[];
    const currentRows = withCurrentCompletion(this.graph, rows);
    const now = this.now();
    return {
      activeItemId: state.activeItemId,
      activeTaskId: state.activeItemId,
      revision: state.revision,
      progress: currentRows.map((item) => ({ ...item, taskId: item.itemId })),
      availability: deriveAvailability(this.graph, currentRows),
      reviews: (reviewResult.results as StoredReviewRow[]).map((row) => toReviewView(row, now)),
    };
  }

  async export() {
    const [stateResult, progressResult, reviewResult, sessionsResult, attemptsResult] = await this.db.batch([
      this.db.prepare('SELECT active_item_id AS activeItemId, revision FROM learner_state WHERE id=1'),
      this.db.prepare('SELECT item_id AS itemId, status, passed_fingerprint AS passedFingerprint, last_anchor AS lastAnchor, continue_from AS continueFrom FROM item_progress'),
      this.db.prepare(`SELECT item_id AS itemId, policy_version AS policyVersion, step,
        due_at AS dueAt, state AS storedState FROM review_schedule`),
      this.db.prepare('SELECT id, item_id AS itemId, recorded_at AS recordedAt, payload FROM sessions ORDER BY rowid'),
      this.db.prepare(`SELECT id, item_id AS itemId, question_set_version AS questionSetVersion,
        answers, grading_mode AS gradingMode, score, assisted, result,
        recorded_at AS recordedAt FROM review_attempts ORDER BY rowid`),
    ]);
    const state = stateResult.results[0] as StateRow | undefined;
    if (!state) throw new Error('Database progres belum dimigrasikan.');
    const rows = progressResult.results as ItemProgressState[];
    const currentRows = withCurrentCompletion(this.graph, rows);
    const now = this.now();
    return {
      version: 3,
      activeItemId: state.activeItemId,
      activeTaskId: state.activeItemId,
      revision: state.revision,
      progress: currentRows.map((item) => ({ ...item, taskId: item.itemId })),
      availability: deriveAvailability(this.graph, currentRows),
      reviews: (reviewResult.results as StoredReviewRow[]).map((row) => toReviewView(row, now)),
      sessions: (sessionsResult.results as { id: string; itemId: string | null; recordedAt: string; payload: string }[])
        .map(({ payload, ...row }) => {
          const parsed = JSON.parse(payload) as Record<string, unknown>;
          const itemId = row.itemId ?? String(parsed.itemId ?? parsed.taskId ?? '');
          return {
            ...row,
            ...parsed,
            itemId,
            taskId: itemId,
            continueFrom: typeof parsed.continueFrom === 'string' ? parsed.continueFrom : '',
          };
        }),
      reviewAttempts: (attemptsResult.results as Array<{
        id: string;
        itemId: string;
        questionSetVersion: string;
        answers: string;
        gradingMode: string;
        score: number;
        assisted: number;
        result: string;
        recordedAt: string;
      }>).map((attempt) => ({
        ...attempt,
        answers: JSON.parse(attempt.answers) as number[],
        assisted: Boolean(attempt.assisted),
      })),
    };
  }

  /** Bounded dashboard read; avoid loading full export and review attempts. */
  async recentSessions(limit = 20, itemId?: string) {
    const where = itemId ? ' WHERE item_id=?' : '';
    const params = itemId ? [itemId, limit] : [limit];
    const result = await this.db.prepare(
      'SELECT id, item_id AS itemId, recorded_at AS recordedAt, payload FROM sessions' +
      where + ' ORDER BY rowid DESC LIMIT ?',
    ).bind(...params).all<{ id: string; itemId: string | null; recordedAt: string; payload: string }>();
    const rows = result.results;
    return rows.map(({ payload, ...row }) => {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      const id = row.itemId ?? String(parsed.itemId ?? parsed.taskId ?? '');
      return {
        ...row, ...parsed, itemId: id, taskId: id,
        continueFrom: typeof parsed.continueFrom === 'string' ? parsed.continueFrom : '',
        blocker: typeof parsed.blocker === 'string' ? parsed.blocker : undefined,
      };
    });
  }

  private item(id: string) {
    const item = this.graph.itemsById.get(id);
    if (!item) throw new LearningError(422, 'Item tidak ada di curriculum.');
    return item;
  }

  private validateSession(input: SessionFields, current: LearningSnapshot) {
    const item = this.item(input.itemId);
    if (input.fingerprint !== item.fingerprint) {
      throw new LearningError(409, 'Curriculum berubah. Muat ulang materi.');
    }
    if (current.activeItemId !== item.id) {
      throw new LearningError(409, 'Jadikan item ini aktif sebelum menyimpan sesi.');
    }

    const expected = requiredEvidenceForItem(item).map((entry) => entry.id);
    const provided = input.evidence.map((entry) => entry.criterionId);
    if (new Set(provided).size !== provided.length || provided.some((id) => !expected.includes(id))) {
      throw new LearningError(422, 'Rujukan bukti tidak valid.');
    }

    if (input.kind === 'passed') {
      if (expected.some((id) => !provided.includes(id))) {
        throw new LearningError(422, 'Lengkapi bukti untuk semua target dan latihan.');
      }
    } else if (
      !input.evidence.length &&
      !input.continueFrom &&
      !input.blocker &&
      !Object.values(input.reflection ?? {}).some((value) => value.trim())
    ) {
      throw new LearningError(422, 'Isi titik lanjut, hambatan, bukti, atau catatan sesi.');
    }
    return item;
  }

  private progressAfter(current: LearningSnapshot, input: SessionFields) {
    const previous = current.progress.find((entry) => entry.itemId === input.itemId);
    const next = {
      itemId: input.itemId,
      taskId: input.itemId,
      status: input.kind === 'passed' ? 'passed' as const : previous?.status ?? 'active' as const,
      passedFingerprint: input.kind === 'passed' ? input.fingerprint : previous?.passedFingerprint ?? null,
      lastAnchor: input.lastAnchor,
      continueFrom: input.continueFrom,
    };
    return previous
      ? current.progress.map((entry) => entry.itemId === input.itemId ? next : entry)
      : [...current.progress, next];
  }

  private async mutate(
    raw: { requestId: string; revision: number },
    operation: string,
    sessions: SessionFields[],
    activeItemId?: string,
    idempotencyInput: unknown = raw,
  ) {
    const hash = createHash('sha256').update(JSON.stringify({ operation, input: idempotencyInput })).digest('hex');
    const old = await this.db.prepare(
      'SELECT payload_hash, response, nonce FROM request_receipts WHERE request_id=?',
    ).bind(raw.requestId).first<StoredReceipt>();
    if (old) {
      if (old.payload_hash !== hash) throw new LearningError(409, 'Request ID sudah dipakai untuk data berbeda.');
      return JSON.parse(old.response) as LearningSnapshot;
    }

    const current = await this.snapshot();
    if (current.revision !== raw.revision) {
      throw new LearningError(409, 'Progres berubah di tab lain. Muat ulang sebelum menyimpan.');
    }
    for (const session of sessions) this.validateSession(session, current);

    if (activeItemId !== undefined) {
      this.item(activeItemId);
      const availability = current.availability.find((entry) => entry.itemId === activeItemId);
      if (availability?.status === 'locked') {
        throw new LearningError(
          422,
          `Item masih terkunci. Selesaikan: ${availability.missingPrerequisites.join(', ')}.`,
        );
      }
    }

    const now = this.now();
    const nonce = randomUUID();
    const nextProgress = sessions.reduce(
      (progress, session) => this.progressAfter({ ...current, progress }, session),
      [...current.progress],
    );

    if (activeItemId && !nextProgress.some((entry) => entry.itemId === activeItemId)) {
      nextProgress.push({
        itemId: activeItemId,
        taskId: activeItemId,
        status: 'active',
        passedFingerprint: null,
        lastAnchor: '',
        continueFrom: '',
      });
    }

    const reviewRows = new Map(
      current.reviews.map((view) => [view.itemId, storedFromView(view)]),
    );
    const newlyPassed = sessions.filter((session) =>
      session.kind === 'passed' &&
      current.progress.find((entry) => entry.itemId === session.itemId)?.status !== 'passed'
    );
    for (const session of newlyPassed) {
      reviewRows.set(session.itemId, initialReviewSchedule(session.itemId, now));
    }

    const nextReviews = [...reviewRows.values()].map((row) => toReviewView(row, now));
    const response: LearningSnapshot = {
      activeItemId: activeItemId ?? current.activeItemId,
      activeTaskId: activeItemId ?? current.activeItemId,
      revision: current.revision + 1,
      progress: nextProgress,
      availability: deriveAvailability(this.graph, nextProgress),
      reviews: nextReviews,
    };

    const requestId = raw.requestId;
    const revision = raw.revision;
    const statements: D1Statement[] = [
      this.db.prepare(`INSERT INTO request_receipts(request_id,payload_hash,response,nonce)
        SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM learner_state WHERE id=1 AND revision=?)
        AND NOT EXISTS (SELECT 1 FROM request_receipts WHERE request_id=?)`)
        .bind(requestId, hash, JSON.stringify(response), nonce, revision, requestId),
      this.db.prepare(`UPDATE learner_state
        SET revision=revision+1${activeItemId === undefined ? '' : ', active_item_id=?, active_task_id=?'}
        WHERE id=1 AND revision=? AND EXISTS (
          SELECT 1 FROM request_receipts WHERE request_id=? AND nonce=?
        )`)
        .bind(...(activeItemId === undefined
          ? [revision, requestId, nonce]
          : [activeItemId, activeItemId, revision, requestId, nonce])),
    ];

    for (const session of sessions) {
      const id = randomUUID();
      const recordedAt = now.toISOString();
      const payload = JSON.stringify({ ...session, taskId: session.itemId });
      statements.push(this.db.prepare(`INSERT INTO sessions(id,task_id,recorded_at,payload,item_id)
        SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM learner_state WHERE id=1 AND revision=?+1)
        AND EXISTS (SELECT 1 FROM request_receipts WHERE request_id=? AND nonce=?)`)
        .bind(id, session.itemId, recordedAt, payload, session.itemId, revision, requestId, nonce));

      const status = session.kind === 'passed' ? 'passed' : 'active';
      const passedFingerprint = session.kind === 'passed' ? session.fingerprint : null;
      for (const [table, column] of [['item_progress', 'item_id'], ['task_progress', 'task_id']] as const) {
        statements.push(this.db.prepare(`INSERT INTO ${table}(${column},status,passed_fingerprint,last_anchor,continue_from)
          SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM learner_state WHERE id=1 AND revision=?+1)
          AND EXISTS (SELECT 1 FROM request_receipts WHERE request_id=? AND nonce=?)
          ON CONFLICT(${column}) DO UPDATE SET
            status=CASE WHEN excluded.status='passed' THEN 'passed' ELSE ${table}.status END,
            passed_fingerprint=COALESCE(excluded.passed_fingerprint,${table}.passed_fingerprint),
            last_anchor=excluded.last_anchor,
            continue_from=excluded.continue_from`)
          .bind(session.itemId, status, passedFingerprint, session.lastAnchor, session.continueFrom, revision, requestId, nonce));
      }
    }

    for (const session of newlyPassed) {
      const schedule = reviewRows.get(session.itemId)!;
      statements.push(this.db.prepare(`INSERT INTO review_schedule(item_id,policy_version,step,due_at,state)
        SELECT ?,?,?,?,? WHERE EXISTS (
          SELECT 1 FROM request_receipts WHERE request_id=? AND nonce=?
        )
        ON CONFLICT(item_id) DO UPDATE SET
          policy_version=excluded.policy_version,
          step=excluded.step,
          due_at=excluded.due_at,
          state=excluded.state`)
        .bind(
          schedule.itemId,
          schedule.policyVersion,
          schedule.step,
          schedule.dueAt,
          schedule.storedState,
          requestId,
          nonce,
        ));
    }

    if (activeItemId && !current.progress.some((entry) => entry.itemId === activeItemId)) {
      for (const [table, column] of [['item_progress', 'item_id'], ['task_progress', 'task_id']] as const) {
        statements.push(this.db.prepare(`INSERT INTO ${table}(${column},status,passed_fingerprint,last_anchor,continue_from)
          SELECT ?,'active',NULL,'','' WHERE EXISTS (
            SELECT 1 FROM request_receipts WHERE request_id=? AND nonce=?
          ) ON CONFLICT(${column}) DO NOTHING`)
          .bind(activeItemId, requestId, nonce));
      }
    }

    await this.db.batch(statements);
    const receipt = await this.db.prepare(
      'SELECT payload_hash, response, nonce FROM request_receipts WHERE request_id=?',
    ).bind(requestId).first<StoredReceipt>();
    if (!receipt) throw new LearningError(409, 'Progres berubah di tab lain. Muat ulang sebelum menyimpan.');
    if (receipt.payload_hash !== hash) throw new LearningError(409, 'Request ID sudah dipakai untuk data berbeda.');
    return JSON.parse(receipt.response) as LearningSnapshot;
  }

  async saveSession(raw: unknown) {
    const input = sessionSchema.parse(raw);
    const { requestId, revision, ...session } = input;
    return this.mutate({ requestId, revision }, 'session', [session], undefined, input);
  }

  async setActiveItem(raw: unknown) {
    const input = activeItemSchema.parse(raw);
    const sessions = input.previousSession ? [input.previousSession] : [];
    return this.mutate(
      { requestId: input.requestId, revision: input.revision },
      'active-item',
      sessions,
      input.itemId,
      input,
    );
  }

  async submitReview(raw: unknown) {
    const input = reviewAttemptSchema.parse(raw);
    const item = this.item(input.itemId);
    const bank = this.reviewBankFor(input.itemId);
    if (!bank) throw new LearningError(422, 'Soal review belum tersedia untuk materi ini.');
    if (bank.curriculumFingerprint !== item.fingerprint) {
      throw new LearningError(409, 'Soal review perlu diperbarui untuk versi materi terbaru.');
    }

    let grading: ReturnType<typeof gradeReview>;
    try {
      grading = gradeReview(bank, input);
    } catch (error) {
      throw new LearningError(422, error instanceof Error ? error.message : 'Review tidak valid.');
    }

    const hash = createHash('sha256').update(JSON.stringify({ operation: 'review', input })).digest('hex');
    const old = await this.db.prepare(
      'SELECT payload_hash, response, nonce FROM request_receipts WHERE request_id=?',
    ).bind(input.requestId).first<StoredReceipt>();
    if (old) {
      if (old.payload_hash !== hash) throw new LearningError(409, 'Request ID sudah dipakai untuk data berbeda.');
      return {
        ...(JSON.parse(old.response) as LearningSnapshot),
        reviewAttempt: grading,
        reviewFeedback: bank.questions.map((question, index) => ({
          id: question.id,
          correct: input.answers[index] === question.answer,
          answer: question.answer,
          explanation: question.explanation,
        })),
      };
    }

    const current = await this.snapshot();
    if (current.revision !== input.revision) {
      throw new LearningError(409, 'Progres berubah di tab lain. Muat ulang sebelum menyimpan.');
    }
    const completion = current.progress.find((entry) => entry.itemId === input.itemId);
    if (completion?.status !== 'passed') {
      throw new LearningError(422, 'Review tersedia setelah materi selesai dan masih sesuai kurikulum terbaru.');
    }

    const view = current.reviews.find((entry) => entry.itemId === input.itemId);
    if (!view) throw new LearningError(422, 'Review belum terjadwal.');
    if (view.state === 'scheduled') throw new LearningError(422, 'Review belum jatuh tempo.');
    if (view.state === 'retained') throw new LearningError(422, 'Semua jadwal review untuk materi ini sudah selesai.');

    const now = this.now();
    const currentRow = storedFromView(view);
    const nextSchedule = advanceReviewSchedule(currentRow, grading.result === 'passed', now);
    const nextReviews = current.reviews.map((entry) =>
      entry.itemId === input.itemId ? toReviewView(nextSchedule, now) : entry
    );
    const response: LearningSnapshot = {
      ...current,
      revision: current.revision + 1,
      reviews: nextReviews,
    };

    const nonce = randomUUID();
    const attemptId = randomUUID();
    const statements: D1Statement[] = [
      this.db.prepare(`INSERT INTO request_receipts(request_id,payload_hash,response,nonce)
        SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM learner_state WHERE id=1 AND revision=?)
        AND NOT EXISTS (SELECT 1 FROM request_receipts WHERE request_id=?)`)
        .bind(input.requestId, hash, JSON.stringify(response), nonce, input.revision, input.requestId),
      this.db.prepare(`UPDATE learner_state SET revision=revision+1
        WHERE id=1 AND revision=? AND EXISTS (
          SELECT 1 FROM request_receipts WHERE request_id=? AND nonce=?
        )`)
        .bind(input.revision, input.requestId, nonce),
      this.db.prepare(`INSERT INTO review_attempts(
          id,item_id,question_set_version,answers,grading_mode,score,assisted,result,recorded_at
        )
        SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS (
          SELECT 1 FROM request_receipts WHERE request_id=? AND nonce=?
        )`)
        .bind(
          attemptId,
          input.itemId,
          input.questionSetVersion,
          JSON.stringify(input.answers),
          'multiple_choice',
          grading.score,
          grading.assisted ? 1 : 0,
          grading.result,
          now.toISOString(),
          input.requestId,
          nonce,
        ),
      this.db.prepare(`UPDATE review_schedule
        SET policy_version=?, step=?, due_at=?, state=?
        WHERE item_id=? AND EXISTS (
          SELECT 1 FROM request_receipts WHERE request_id=? AND nonce=?
        )`)
        .bind(
          nextSchedule.policyVersion,
          nextSchedule.step,
          nextSchedule.dueAt,
          nextSchedule.storedState,
          input.itemId,
          input.requestId,
          nonce,
        ),
    ];

    await this.db.batch(statements);
    const receipt = await this.db.prepare(
      'SELECT payload_hash, response, nonce FROM request_receipts WHERE request_id=?',
    ).bind(input.requestId).first<StoredReceipt>();
    if (!receipt) throw new LearningError(409, 'Progres berubah di tab lain. Muat ulang sebelum menyimpan.');
    if (receipt.payload_hash !== hash) throw new LearningError(409, 'Request ID sudah dipakai untuk data berbeda.');
    return {
      ...(JSON.parse(receipt.response) as LearningSnapshot),
      reviewAttempt: grading,
      reviewFeedback: bank.questions.map((question, index) => ({
        id: question.id,
        correct: input.answers[index] === question.answer,
        answer: question.answer,
        explanation: question.explanation,
      })),
    };
  }

  setActiveTask(raw: unknown) {
    return this.setActiveItem(raw);
  }
}
