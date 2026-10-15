import type { SessionFields } from '../../domain/learning/schema';

// Empty or time-only drafts are not valid progress sessions; switching items
// must not accidentally submit them.
export function hasSessionNotes(draft: SessionFields | undefined): boolean {
  if (!draft) return false;
  return draft.evidence.some((entry) => entry.text.trim().length > 0) ||
    Boolean(draft.continueFrom?.trim() || draft.blocker?.trim()) ||
    Object.values(draft.reflection ?? {}).some((entry) => entry.trim().length > 0);
}

export function readDraft(itemId: string): SessionFields | undefined {
  try {
    const draft: unknown = JSON.parse(localStorage.getItem('cs101:draft:' + itemId) || 'null');
    if (!draft || typeof draft !== 'object') return undefined;
    const value = draft as Record<string, unknown>;
    if (typeof value.itemId !== 'string' || typeof value.fingerprint !== 'string' ||
      !Array.isArray(value.evidence) || typeof value.continueFrom !== 'string' ||
      typeof value.lastAnchor !== 'string') return undefined;
    return value as SessionFields;
  } catch {
    return undefined;
  }
}

export function writeDraft(itemId: string, draft: SessionFields) {
  try {
    localStorage.setItem('cs101:draft:' + itemId, JSON.stringify(draft));
  } catch {}
}

export function removeDraft(itemId: string) {
  try {
    localStorage.removeItem('cs101:draft:' + itemId);
  } catch {}
}

export class MutationError extends Error {
  constructor(message: string, public status: number, public code: string) { super(message); }
}
export async function postWithRevisionRetry<T extends { revision: number }>(
  path: string,
  payload: Record<string, unknown> & { revision: number; requestId: string },
  canRetry?: (revision: number) => Promise<boolean>,
): Promise<T> {
  try { return await postJson<T>(path, payload); }
  catch (cause) {
    if (!(cause instanceof MutationError) || cause.code !== 'REVISION_CONFLICT') throw cause;
    const response = await fetch('/api/learning', { cache: 'no-store' });
    if (!response.ok) throw cause;
    const latest = await response.json() as { revision: number };
    if (canRetry && !(await canRetry(latest.revision))) throw cause;
    return postJson<T>(path, { ...payload, revision: latest.revision, requestId: crypto.randomUUID() });
  }
}
export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new MutationError(data.error || 'Perubahan belum tersimpan. Coba lagi.', response.status, data.code ?? 'REQUEST_FAILED');
  return data as T;
}
