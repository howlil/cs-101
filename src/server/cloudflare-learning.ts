import { createHash, randomUUID } from 'node:crypto';
import { fingerprint, requiredEvidence, type Task } from '../domain/curriculum';
import { activeTaskSchema, sessionSchema, type SessionFields } from '../domain/learning/schema';
import { LearningError } from './learning';

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

type State = { activeTaskId: string | null; revision: number };
type Progress = { taskId: string; status: 'active' | 'passed'; passedFingerprint: string | null; lastAnchor: string; continueFrom: string };
type Snapshot = State & { progress: Progress[] };
type StoredReceipt = { payload_hash: string; response: string; nonce: string };

export class CloudflareLearningService {
  constructor(private db: D1Database, private tasks: Task[], private lessonReady: (task: Task) => boolean) {}

  async snapshot(): Promise<Snapshot> {
    const [stateResult, progressResult] = await this.db.batch([
      this.db.prepare('SELECT active_task_id AS activeTaskId, revision FROM learner_state WHERE id=1'),
      this.db.prepare('SELECT task_id AS taskId, status, passed_fingerprint AS passedFingerprint, last_anchor AS lastAnchor, continue_from AS continueFrom FROM task_progress'),
    ]);
    const state = stateResult.results[0] as State | undefined;
    if (!state) throw new Error('Database progres belum dimigrasikan.');
    return { ...state, progress: progressResult.results as Progress[] };
  }

  async export() {
    const [stateResult, progressResult, sessionsResult] = await this.db.batch([
      this.db.prepare('SELECT active_task_id AS activeTaskId, revision FROM learner_state WHERE id=1'),
      this.db.prepare('SELECT task_id AS taskId, status, passed_fingerprint AS passedFingerprint, last_anchor AS lastAnchor, continue_from AS continueFrom FROM task_progress'),
      this.db.prepare('SELECT id, recorded_at AS recordedAt, payload FROM sessions ORDER BY rowid'),
    ]);
    const state = stateResult.results[0] as State | undefined;
    if (!state) throw new Error('Database progres belum dimigrasikan.');
    return {
      version: 1,
      ...state,
      progress: progressResult.results as Progress[],
      sessions: (sessionsResult.results as { id: string; recordedAt: string; payload: string }[])
        .map(({ payload, ...row }) => ({ ...row, ...JSON.parse(payload) })),
    };
  }

  private task(id: string) {
    const task = this.tasks.find((item) => item.taskId === id);
    if (!task) throw new LearningError(422, 'Task tidak ada di curriculum.');
    return task;
  }

  private validateSession(input: SessionFields, current: Snapshot) {
    const task = this.task(input.taskId);
    if (input.fingerprint !== fingerprint(task)) throw new LearningError(409, 'Curriculum berubah. Muat ulang materi.');
    if (current.activeTaskId !== task.taskId) throw new LearningError(409, 'Jadikan task ini aktif sebelum menyimpan sesi.');
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
    return task;
  }

  private progressAfter(current: Snapshot, input: SessionFields): Progress[] {
    const previous = current.progress.find((item) => item.taskId === input.taskId);
    const next: Progress = {
      taskId: input.taskId,
      status: input.kind === 'passed' ? 'passed' : previous?.status ?? 'active',
      passedFingerprint: input.kind === 'passed' ? input.fingerprint : previous?.passedFingerprint ?? null,
      lastAnchor: input.lastAnchor,
      continueFrom: input.continueFrom,
    };
    return previous
      ? current.progress.map((item) => item.taskId === input.taskId ? next : item)
      : [...current.progress, next];
  }

  private async mutate(
    raw: { requestId: string; revision: number },
    operation: string,
    sessions: SessionFields[],
    activeTaskId?: string,
    idempotencyInput: unknown = raw,
  ) {
    const hash = createHash('sha256').update(JSON.stringify({ operation, input: idempotencyInput })).digest('hex');
    const old = await this.db.prepare('SELECT payload_hash, response, nonce FROM request_receipts WHERE request_id=?').bind(raw.requestId).first<StoredReceipt>();
    if (old) {
      if (old.payload_hash !== hash) throw new LearningError(409, 'Request ID sudah dipakai untuk data berbeda.');
      return JSON.parse(old.response) as Snapshot;
    }

    const current = await this.snapshot();
    if (current.revision !== raw.revision) throw new LearningError(409, 'Progres berubah di tab lain. Muat ulang sebelum menyimpan.');
    for (const session of sessions) this.validateSession(session, current);

    const nonce = randomUUID();
    const response: Snapshot = {
      activeTaskId: activeTaskId ?? current.activeTaskId,
      revision: current.revision + 1,
      progress: sessions.reduce((progress, session) => this.progressAfter({ ...current, progress }, session), current.progress),
    };
    const requestId = raw.requestId;
    const revision = raw.revision;
    const statements: D1Statement[] = [
      this.db.prepare(`INSERT INTO request_receipts(request_id,payload_hash,response,nonce)
        SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM learner_state WHERE id=1 AND revision=?)
        AND NOT EXISTS (SELECT 1 FROM request_receipts WHERE request_id=?)`)
        .bind(requestId, hash, JSON.stringify(response), nonce, revision, requestId),
      this.db.prepare(`UPDATE learner_state SET revision=revision+1${activeTaskId === undefined ? '' : ', active_task_id=?'}
        WHERE id=1 AND revision=? AND EXISTS (SELECT 1 FROM request_receipts WHERE request_id=? AND nonce=?)`)
        .bind(...(activeTaskId === undefined ? [revision, requestId, nonce] : [activeTaskId, revision, requestId, nonce])),
    ];

    for (const session of sessions) {
      const id = randomUUID();
      const recordedAt = new Date().toISOString();
      const payload = JSON.stringify(session);
      const task = this.task(session.taskId);
      statements.push(this.db.prepare(`INSERT INTO sessions(id,task_id,recorded_at,payload)
        SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM learner_state WHERE id=1 AND revision=?+1)
        AND EXISTS (SELECT 1 FROM request_receipts WHERE request_id=? AND nonce=?)`)
        .bind(id, task.taskId, recordedAt, payload, revision, requestId, nonce));
      statements.push(this.db.prepare(`INSERT INTO task_progress(task_id,status,passed_fingerprint,last_anchor,continue_from)
        SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM learner_state WHERE id=1 AND revision=?+1)
        AND EXISTS (SELECT 1 FROM request_receipts WHERE request_id=? AND nonce=?)
        ON CONFLICT(task_id) DO UPDATE SET
          status=CASE WHEN excluded.status='passed' THEN 'passed' ELSE task_progress.status END,
          passed_fingerprint=COALESCE(excluded.passed_fingerprint,task_progress.passed_fingerprint),
          last_anchor=excluded.last_anchor, continue_from=excluded.continue_from`)
        .bind(task.taskId, session.kind === 'passed' ? 'passed' : 'active', session.kind === 'passed' ? session.fingerprint : null,
          session.lastAnchor, session.continueFrom, revision, requestId, nonce));
    }

    await this.db.batch(statements);
    const receipt = await this.db.prepare('SELECT payload_hash, response, nonce FROM request_receipts WHERE request_id=?').bind(requestId).first<StoredReceipt>();
    if (!receipt) throw new LearningError(409, 'Progres berubah di tab lain. Muat ulang sebelum menyimpan.');
    if (receipt.payload_hash !== hash) throw new LearningError(409, 'Request ID sudah dipakai untuk data berbeda.');
    return JSON.parse(receipt.response) as Snapshot;
  }

  async saveSession(raw: unknown) {
    const input = sessionSchema.parse(raw);
    const { requestId, revision, ...session } = input;
    return this.mutate({ requestId, revision }, 'session', [session], undefined, input);
  }

  async setActiveTask(raw: unknown) {
    const input = activeTaskSchema.parse(raw);
    this.task(input.taskId);
    const sessions = input.previousSession ? [input.previousSession] : [];
    return this.mutate({ requestId: input.requestId, revision: input.revision }, 'active-task', sessions, input.taskId, input);
  }
}
