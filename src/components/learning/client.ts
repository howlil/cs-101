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
    return JSON.parse(localStorage.getItem('cs101:draft:' + itemId) || 'null') ?? undefined;
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

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Perubahan belum tersimpan. Coba lagi.');
  return data as T;
}
