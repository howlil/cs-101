import type { SessionFields } from '../../domain/learning/schema';

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
