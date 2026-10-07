import type { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import type { CurriculumGraph } from '../domain/curriculum-v2/graph';
import {
  deriveAvailability,
  requiredEvidenceForItem,
  type ItemProgressState,
} from '../domain/learning/rules';
import { activeItemSchema, sessionSchema, type SessionFields } from '../domain/learning/schema';

export class LearningError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type StateRow = { activeItemId: string | null; revision: number };
export type LearningProgress = ItemProgressState & { taskId: string };
export type LearningSnapshot = {
  activeItemId: string | null;
  activeTaskId: string | null;
  revision: number;
  progress: LearningProgress[];
  availability: ReturnType<typeof deriveAvailability>;
};

export class LearningService {
  constructor(
    private db: DatabaseSync,
    private graph: CurriculumGraph,
    private lessonReady: (itemId: string) => boolean,
  ) {}

  snapshot(): LearningSnapshot {
    const state = this.db.prepare(
      'SELECT active_item_id AS activeItemId, revision FROM learner_state WHERE id=1',
    ).get() as StateRow;
    const rows = this.db.prepare(
      'SELECT item_id AS itemId, status, passed_fingerprint AS passedFingerprint, last_anchor AS lastAnchor, continue_from AS continueFrom FROM item_progress',
    ).all() as ItemProgressState[];
    const progress = rows.map((item) => ({ ...item, taskId: item.itemId }));
    return {
      activeItemId: state.activeItemId,
      activeTaskId: state.activeItemId,
      revision: state.revision,
      progress,
      availability: deriveAvailability(this.graph, rows),
    };
  }

  export() {
    const sessions = this.db.prepare(
      'SELECT id, item_id AS itemId, recorded_at AS recordedAt, payload FROM sessions ORDER BY rowid',
    ).all() as { id: string; itemId: string | null; recordedAt: string; payload: string }[];
    return {
      version: 2,
      ...this.snapshot(),
      sessions: sessions.map(({ payload, ...row }) => {
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
      this.db.prepare('INSERT INTO request_receipts VALUES(?,?,?)')
        .run(input.requestId, hash, JSON.stringify(response));
      this.db.exec('COMMIT');
      return response;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  private writeSession(input: SessionFields) {
    const item = this.item(input.itemId);
    if (input.fingerprint !== item.fingerprint) {
      throw new LearningError(409, 'Curriculum berubah. Muat ulang materi.');
    }
    if (this.snapshot().activeItemId !== item.id) {
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

    const payload = JSON.stringify({ ...input, taskId: item.id });
    this.db.prepare(
      'INSERT INTO sessions(id,task_id,recorded_at,payload,item_id) VALUES(?,?,?,?,?)',
    ).run(randomUUID(), item.id, new Date().toISOString(), payload, item.id);

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

  // Compatibility for old endpoint/client.
  setActiveTask(raw: unknown) {
    return this.setActiveItem(raw);
  }
}
