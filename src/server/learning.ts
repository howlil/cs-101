import type { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { fingerprint, requiredEvidence, type Task } from '../domain/curriculum';
import { activeTaskSchema, sessionSchema, type SessionFields } from '../domain/learning/schema';

export class LearningError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
type State = { activeTaskId: string | null; revision: number };
type Progress = { taskId: string; status: 'active' | 'passed'; passedFingerprint: string | null; lastAnchor: string; continueFrom: string };

export class LearningService {
  constructor(private db: DatabaseSync, private tasks: Task[], private lessonReady: (task: Task) => boolean) {}

  snapshot() {
    const state = this.db.prepare('SELECT active_task_id AS activeTaskId, revision FROM learner_state WHERE id=1').get() as State;
    const progress = this.db.prepare('SELECT task_id AS taskId, status, passed_fingerprint AS passedFingerprint, last_anchor AS lastAnchor, continue_from AS continueFrom FROM task_progress').all() as Progress[];
    return { ...state, progress: progress.map((item) => ({ ...item })) };
  }

  export() {
    const sessions = this.db.prepare('SELECT id, recorded_at AS recordedAt, payload FROM sessions ORDER BY rowid').all() as { id: string; recordedAt: string; payload: string }[];
    return { version: 1, ...this.snapshot(), sessions: sessions.map(({ payload, ...row }) => ({ ...row, ...JSON.parse(payload) })) };
  }

  private task(id: string) {
    const task = this.tasks.find((item) => item.taskId === id);
    if (!task) throw new LearningError(422, 'Task tidak ada di curriculum.');
    return task;
  }

  private mutate(input: { requestId: string; revision: number }, operation: string, work: () => void) {
    const hash = createHash('sha256').update(JSON.stringify({ operation, input })).digest('hex');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const old = this.db.prepare('SELECT payload_hash, response FROM request_receipts WHERE request_id=?').get(input.requestId) as { payload_hash: string; response: string } | undefined;
      if (old) {
        if (old.payload_hash !== hash) throw new LearningError(409, 'Request ID sudah dipakai untuk data berbeda.');
        this.db.exec('COMMIT');
        return JSON.parse(old.response) as ReturnType<LearningService['snapshot']>;
      }
      if (this.snapshot().revision !== input.revision) throw new LearningError(409, 'Progres berubah di tab lain. Muat ulang sebelum menyimpan.');
      work();
      this.db.prepare('UPDATE learner_state SET revision=revision+1 WHERE id=1').run();
      const response = this.snapshot();
      this.db.prepare('INSERT INTO request_receipts VALUES(?,?,?)').run(input.requestId, hash, JSON.stringify(response));
      this.db.exec('COMMIT');
      return response;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  private writeSession(input: SessionFields) {
    const task = this.task(input.taskId);
    if (input.fingerprint !== fingerprint(task)) throw new LearningError(409, 'Curriculum berubah. Muat ulang materi.');
    if (this.snapshot().activeTaskId !== task.taskId) throw new LearningError(409, 'Jadikan task ini aktif sebelum menyimpan sesi.');
    const expected = requiredEvidence(task).map((item) => item.id);
    const provided = input.evidence.map((item) => item.criterionId);
    if (new Set(provided).size !== provided.length || provided.some((id) => !expected.includes(id))) {
      throw new LearningError(422, 'Rujukan bukti tidak valid.');
    }
    if (input.kind === 'passed') {
      if (!this.lessonReady(task)) throw new LearningError(422, 'Materi valid belum tersedia untuk task ini.');
      if (expected.some((id) => !provided.includes(id))) throw new LearningError(422, 'Lengkapi bukti untuk semua kriteria dan challenge.');
    } else if (!input.evidence.length && !input.continueFrom) {
      throw new LearningError(422, 'Isi bukti atau catatan lanjut.');
    }
    this.db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(randomUUID(), task.taskId, new Date().toISOString(), JSON.stringify(input));
    this.db.prepare(`INSERT INTO task_progress(task_id,status,passed_fingerprint,last_anchor,continue_from) VALUES(?,?,?,?,?)
      ON CONFLICT(task_id) DO UPDATE SET
        status=CASE WHEN excluded.status='passed' THEN 'passed' ELSE task_progress.status END,
        passed_fingerprint=COALESCE(excluded.passed_fingerprint,task_progress.passed_fingerprint),
        last_anchor=excluded.last_anchor, continue_from=excluded.continue_from`).run(
      task.taskId, input.kind === 'passed' ? 'passed' : 'active', input.kind === 'passed' ? input.fingerprint : null, input.lastAnchor, input.continueFrom,
    );
  }

  saveSession(raw: unknown) {
    const input = sessionSchema.parse(raw);
    return this.mutate(input, 'session', () => {
      const { requestId: _requestId, revision: _revision, ...session } = input;
      this.writeSession(session);
    });
  }

  setActiveTask(raw: unknown) {
    const input = activeTaskSchema.parse(raw);
    return this.mutate(input, 'active-task', () => {
      this.task(input.taskId);
      if (input.previousSession) this.writeSession(input.previousSession);
      this.db.prepare('UPDATE learner_state SET active_task_id=? WHERE id=1').run(input.taskId);
    });
  }
}
