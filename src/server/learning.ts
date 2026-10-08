import type { DatabaseSync } from 'node:sqlite';
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
  sessionSchema,
  reviewAttemptSchema,
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

export class LearningError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type StateRow = { activeItemId: string | null; revision: number };
export type LearningProgress = ItemProgressState & { taskId: string };
export type ReviewAttemptRecord = {
  id: string;
  itemId: string;
  questionSetVersion: string;
  answers: number[];
  gradingMode: 'multiple_choice';
  score: number;
  assisted: boolean;
  result: 'passed' | 'again';
  recordedAt: string;
};
export type LearningSnapshot = {
  activeItemId: string | null;
  activeTaskId: string | null;
  revision: number;
  progress: LearningProgress[];
  availability: ReturnType<typeof deriveAvailability>;
  reviews: ReviewScheduleView[];
};

type StoredReviewRow = {
  itemId: string;
  policyVersion: string;
  step: number;
  dueAt: string | null;
  storedState: ReviewScheduleRow['storedState'];
};

export class LearningService {
  constructor(
    private db: DatabaseSync,
    private graph: CurriculumGraph,
    private reviewBankFor: (itemId: string) => ReviewBank | undefined = () => undefined,
    private now: () => Date = () => new Date(),
  ) {}

  private storedReviewRows(): StoredReviewRow[] {
    return this.db.prepare(
      `SELECT item_id AS itemId, policy_version AS policyVersion, step,
        due_at AS dueAt, state AS storedState
       FROM review_schedule`,
    ).all() as StoredReviewRow[];
  }

  snapshot(): LearningSnapshot {
    const state = this.db.prepare(
      'SELECT active_item_id AS activeItemId, revision FROM learner_state WHERE id=1',
    ).get() as StateRow;
    const rows = this.db.prepare(
      'SELECT item_id AS itemId, status, passed_fingerprint AS passedFingerprint, last_anchor AS lastAnchor, continue_from AS continueFrom FROM item_progress',
    ).all() as ItemProgressState[];
    const currentRows = withCurrentCompletion(this.graph, rows);
    const progress = currentRows.map((item) => ({ ...item, taskId: item.itemId }));
    const now = this.now();
    return {
      activeItemId: state.activeItemId,
      activeTaskId: state.activeItemId,
      revision: state.revision,
      progress,
      availability: deriveAvailability(this.graph, currentRows),
      reviews: this.storedReviewRows().map((row) => toReviewView(row, now)),
    };
  }

  export() {
    const sessions = this.db.prepare(
      'SELECT id, item_id AS itemId, recorded_at AS recordedAt, payload FROM sessions ORDER BY rowid',
    ).all() as { id: string; itemId: string | null; recordedAt: string; payload: string }[];

    const attempts = this.db.prepare(
      `SELECT id, item_id AS itemId, question_set_version AS questionSetVersion,
        answers, grading_mode AS gradingMode, score, assisted, result,
        recorded_at AS recordedAt
       FROM review_attempts ORDER BY rowid`,
    ).all() as Array<{
      id: string;
      itemId: string;
      questionSetVersion: string;
      answers: string;
      gradingMode: 'multiple_choice';
      score: number;
      assisted: number;
      result: 'passed' | 'again';
      recordedAt: string;
    }>;

    return {
      version: 3,
      ...this.snapshot(),
      sessions: sessions.map(({ payload, ...row }) => {
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
      reviewAttempts: attempts.map((attempt) => ({
        ...attempt,
        answers: JSON.parse(attempt.answers) as number[],
        assisted: Boolean(attempt.assisted),
      })),
    };
  }

  /** Bounded dashboard read; the export endpoint remains unchanged. */
  recentSessions(limit = 20, itemId?: string) {
    const where = itemId ? ' WHERE item_id=?' : '';
    const params = itemId ? [itemId, limit] : [limit];
    const rows = this.db.prepare(
      'SELECT id, item_id AS itemId, recorded_at AS recordedAt, payload FROM sessions' +
      where + ' ORDER BY rowid DESC LIMIT ?',
    ).all(...params) as { id: string; itemId: string | null; recordedAt: string; payload: string }[];
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

  private mutate(input: { requestId: string; revision: number }, operation: string, work: () => void) {
    const hash = createHash('sha256').update(JSON.stringify({ operation, input })).digest('hex');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const old = this.db.prepare(
        'SELECT payload_hash, response FROM request_receipts WHERE request_id=?',
      ).get(input.requestId) as { payload_hash: string; response: string } | undefined;
      if (old) {
        if (old.payload_hash !== hash) throw new LearningError(409, 'Request ID sudah dipakai untuk data berbeda.');
        this.db.exec('COMMIT');
        return JSON.parse(old.response) as LearningSnapshot;
      }
      if (this.snapshot().revision !== input.revision) {
        throw new LearningError(409, 'Progres berubah di tab lain. Muat ulang sebelum menyimpan.');
      }
      work();
      this.db.prepare('UPDATE learner_state SET revision=revision+1 WHERE id=1').run();
      const response = this.snapshot();
      this.db.prepare(
        'INSERT INTO request_receipts(request_id,payload_hash,response) VALUES(?,?,?)',
      ).run(input.requestId, hash, JSON.stringify(response));
      this.db.exec('COMMIT');
      return response;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  private scheduleInitialReview(itemId: string) {
    const schedule = initialReviewSchedule(itemId, this.now());
    this.db.prepare(
      `INSERT INTO review_schedule(item_id,policy_version,step,due_at,state)
       VALUES(?,?,?,?,?)
       ON CONFLICT(item_id) DO UPDATE SET
         policy_version=excluded.policy_version,
         step=excluded.step,
         due_at=excluded.due_at,
         state=excluded.state`,
    ).run(
      schedule.itemId,
      schedule.policyVersion,
      schedule.step,
      schedule.dueAt,
      schedule.storedState,
    );
  }

  private writeSession(input: SessionFields) {
    const item = this.item(input.itemId);
    if (input.fingerprint !== item.fingerprint) {
      throw new LearningError(409, 'Curriculum berubah. Muat ulang materi.');
    }

    const before = this.snapshot();
    if (before.activeItemId !== item.id) {
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

    const wasCurrentPass = before.progress.find((entry) => entry.itemId === item.id)?.status === 'passed';
    const payload = JSON.stringify({ ...input, taskId: item.id });
    this.db.prepare(
      'INSERT INTO sessions(id,task_id,recorded_at,payload,item_id) VALUES(?,?,?,?,?)',
    ).run(randomUUID(), item.id, this.now().toISOString(), payload, item.id);

    const status = input.kind === 'passed' ? 'passed' : 'active';
    const passedFingerprint = input.kind === 'passed' ? input.fingerprint : null;

    this.db.prepare(`INSERT INTO item_progress(item_id,status,passed_fingerprint,last_anchor,continue_from) VALUES(?,?,?,?,?)
      ON CONFLICT(item_id) DO UPDATE SET
        status=CASE WHEN excluded.status='passed' THEN 'passed' ELSE item_progress.status END,
        passed_fingerprint=COALESCE(excluded.passed_fingerprint,item_progress.passed_fingerprint),
        last_anchor=excluded.last_anchor,
        continue_from=excluded.continue_from`)
      .run(item.id, status, passedFingerprint, input.lastAnchor, input.continueFrom);

    // Dual-write during V1 compatibility window.
    this.db.prepare(`INSERT INTO task_progress(task_id,status,passed_fingerprint,last_anchor,continue_from) VALUES(?,?,?,?,?)
      ON CONFLICT(task_id) DO UPDATE SET
        status=CASE WHEN excluded.status='passed' THEN 'passed' ELSE task_progress.status END,
        passed_fingerprint=COALESCE(excluded.passed_fingerprint,task_progress.passed_fingerprint),
        last_anchor=excluded.last_anchor,
        continue_from=excluded.continue_from`)
      .run(item.id, status, passedFingerprint, input.lastAnchor, input.continueFrom);

    if (input.kind === 'passed' && !wasCurrentPass) {
      this.scheduleInitialReview(item.id);
    }
  }

  saveSession(raw: unknown) {
    const input = sessionSchema.parse(raw);
    return this.mutate(input, 'session', () => {
      const { requestId: _requestId, revision: _revision, ...session } = input;
      this.writeSession(session);
    });
  }

  setActiveItem(raw: unknown) {
    const input = activeItemSchema.parse(raw);
    return this.mutate(input, 'active-item', () => {
      const item = this.item(input.itemId);
      const current = this.snapshot();
      const availability = current.availability.find((entry) => entry.itemId === item.id);
      if (availability?.status === 'locked') {
        throw new LearningError(
          422,
          `Item masih terkunci. Selesaikan: ${availability.missingPrerequisites.join(', ')}.`,
        );
      }
      if (input.previousSession) this.writeSession(input.previousSession);
      this.db.prepare(
        'UPDATE learner_state SET active_item_id=?, active_task_id=? WHERE id=1',
      ).run(item.id, item.id);
      this.db.prepare(`INSERT INTO item_progress(item_id,status,passed_fingerprint,last_anchor,continue_from)
        VALUES(?,'active',NULL,'','')
        ON CONFLICT(item_id) DO NOTHING`).run(item.id);
      this.db.prepare(`INSERT INTO task_progress(task_id,status,passed_fingerprint,last_anchor,continue_from)
        VALUES(?,'active',NULL,'','')
        ON CONFLICT(task_id) DO NOTHING`).run(item.id);
    });
  }

  submitReview(raw: unknown) {
    const input = reviewAttemptSchema.parse(raw);
    const bank = this.reviewBankFor(input.itemId);
    if (!bank) throw new LearningError(422, 'Soal review belum tersedia untuk materi ini.');

    if (bank.curriculumFingerprint !== this.item(input.itemId).fingerprint) {
      throw new LearningError(409, 'Soal review perlu diperbarui untuk versi materi terbaru.');
    }

    let grading: ReturnType<typeof gradeReview> | undefined;
    const response = this.mutate(input, 'review', () => {
      const current = this.snapshot();
      const completion = current.progress.find((entry) => entry.itemId === input.itemId);
      if (completion?.status !== 'passed') {
        throw new LearningError(422, 'Review tersedia setelah materi selesai dan masih sesuai kurikulum terbaru.');
      }

      const row = this.db.prepare(
        `SELECT item_id AS itemId, policy_version AS policyVersion, step,
          due_at AS dueAt, state AS storedState
         FROM review_schedule WHERE item_id=?`,
      ).get(input.itemId) as StoredReviewRow | undefined;
      if (!row) throw new LearningError(422, 'Review belum terjadwal.');

      const view = toReviewView(row, this.now());
      if (view.state === 'scheduled') {
        throw new LearningError(422, 'Review belum jatuh tempo.');
      }
      if (view.state === 'retained') {
        throw new LearningError(422, 'Semua jadwal review untuk materi ini sudah selesai.');
      }

      try {
        grading = gradeReview(bank, input);
      } catch (error) {
        throw new LearningError(422, error instanceof Error ? error.message : 'Review tidak valid.');
      }

      const recordedAt = this.now().toISOString();
      this.db.prepare(
        `INSERT INTO review_attempts(
          id,item_id,question_set_version,answers,grading_mode,score,assisted,result,recorded_at
        ) VALUES(?,?,?,?,?,?,?,?,?)`,
      ).run(
        randomUUID(),
        input.itemId,
        input.questionSetVersion,
        JSON.stringify(input.answers),
        'multiple_choice',
        grading.score,
        grading.assisted ? 1 : 0,
        grading.result,
        recordedAt,
      );

      const next = advanceReviewSchedule(row, grading.result === 'passed', this.now());
      this.db.prepare(
        `UPDATE review_schedule
         SET policy_version=?, step=?, due_at=?, state=?
         WHERE item_id=?`,
      ).run(next.policyVersion, next.step, next.dueAt, next.storedState, input.itemId);
    });

    return {
      ...response,
      reviewAttempt: grading,
      reviewFeedback: bank.questions.map((question, index) => ({
        id: question.id,
        correct: input.answers[index] === question.answer,
        answer: question.answer,
        explanation: question.explanation,
      })),
    };
  }

  // Compatibility for old endpoint/client.
  setActiveTask(raw: unknown) {
    return this.setActiveItem(raw);
  }
}
