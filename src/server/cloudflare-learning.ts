import { createHash, randomUUID } from 'node:crypto';
import type { CurriculumGraph } from '../domain/curriculum-v2/graph';
import {
  deriveAvailability,
  requiredEvidenceForItem,
  withCurrentCompletion,
  type ItemProgressState,
} from '../domain/learning/rules';
import { activeItemSchema, sessionSchema, type SessionFields } from '../domain/learning/schema';
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

export class CloudflareLearningService {
  constructor(
    private db: D1Database,
    private graph: CurriculumGraph,
    private lessonReady: (itemId: string) => boolean,
  ) {}

  async snapshot(): Promise<LearningSnapshot> {
    const [stateResult, progressResult] = await this.db.batch([
      this.db.prepare('SELECT active_item_id AS activeItemId, revision FROM learner_state WHERE id=1'),
      this.db.prepare('SELECT item_id AS itemId, status, passed_fingerprint AS passedFingerprint, last_anchor AS lastAnchor, continue_from AS continueFrom FROM item_progress'),
    ]);
    const state = stateResult.results[0] as StateRow | undefined;
    if (!state) throw new Error('Database progres belum dimigrasikan.');
    const rows = progressResult.results as ItemProgressState[];
    const currentRows = withCurrentCompletion(this.graph, rows);
    return {
      activeItemId: state.activeItemId,
      activeTaskId: state.activeItemId,
      revision: state.revision,
      progress: currentRows.map((item) => ({ ...item, taskId: item.itemId })),
      availability: deriveAvailability(this.graph, currentRows),
    };
  }

  async export() {
    const [stateResult, progressResult, sessionsResult] = await this.db.batch([
      this.db.prepare('SELECT active_item_id AS activeItemId, revision FROM learner_state WHERE id=1'),
      this.db.prepare('SELECT item_id AS itemId, status, passed_fingerprint AS passedFingerprint, last_anchor AS lastAnchor, continue_from AS continueFrom FROM item_progress'),
      this.db.prepare('SELECT id, item_id AS itemId, recorded_at AS recordedAt, payload FROM sessions ORDER BY rowid'),
    ]);
    const state = stateResult.results[0] as StateRow | undefined;
    if (!state) throw new Error('Database progres belum dimigrasikan.');
    const rows = progressResult.results as ItemProgressState[];
    const currentRows = withCurrentCompletion(this.graph, rows);
    return {
      version: 2,
      activeItemId: state.activeItemId,
      activeTaskId: state.activeItemId,
      revision: state.revision,
      progress: currentRows.map((item) => ({ ...item, taskId: item.itemId })),
      availability: deriveAvailability(this.graph, currentRows),
      sessions: (sessionsResult.results as { id: string; itemId: string | null; recordedAt: string; payload: string }[])
        .map(({ payload, ...row }) => {
          const parsed = JSON.parse(payload) as Record<string, unknown>;
          const itemId = row.itemId ?? String(parsed.itemId ?? parsed.taskId ?? '');
          return { ...row, ...parsed, itemId, taskId: itemId };
        }),
    };
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
      if (item.kind === 'unit' && !this.lessonReady(item.id)) {
        throw new LearningError(422, 'Materi valid belum tersedia untuk unit ini.');
      }
      if (expected.some((id) => !provided.includes(id))) {
        throw new LearningError(422, 'Lengkapi bukti untuk semua kriteria dan challenge.');
      }
    } else if (!input.evidence.length && !input.continueFrom) {
      throw new LearningError(422, 'Isi bukti atau catatan lanjut.');
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

    const nonce = randomUUID();
    const nextProgress = sessions.reduce(
      (progress, session) => this.progressAfter({ ...current, progress }, session),
      current.progress,
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

    const response: LearningSnapshot = {
      activeItemId: activeItemId ?? current.activeItemId,
      activeTaskId: activeItemId ?? current.activeItemId,
      revision: current.revision + 1,
      progress: nextProgress,
      availability: deriveAvailability(this.graph, nextProgress),
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
      const recordedAt = new Date().toISOString();
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

  setActiveTask(raw: unknown) {
    return this.setActiveItem(raw);
  }
}
