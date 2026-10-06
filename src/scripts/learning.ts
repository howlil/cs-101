import type { SessionFields } from '../domain/learning/schema';

function readDraft(taskId: string): SessionFields | undefined {
  try { return JSON.parse(localStorage.getItem(`cs101:draft:${taskId}`) || 'null') ?? undefined; } catch { return undefined; }
}
function removeDraft(taskId: string) { try { localStorage.removeItem(`cs101:draft:${taskId}`); } catch {} }

function announce(scope: string, title: string, message: string, tone: 'info' | 'success' | 'warning' | 'danger' = 'info') {
  window.dispatchEvent(new CustomEvent('cs101:feedback', { detail: { scope, title, message, tone } }));
}

function sender() {
  let previous = '';
  let requestId = '';
  return async (path: string, input: object) => {
    const serialized = JSON.stringify({ path, input });
    if (serialized !== previous) { previous = serialized; requestId = crypto.randomUUID(); }
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, requestId }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Sesi belum tersimpan. Coba lagi.');
    previous = '';
    return data as { revision: number };
  };
}

document.querySelectorAll<HTMLFormElement>('.session-form').forEach((form) => {
  const taskId = form.dataset.taskId!;
  const send = sender();
  const read = (kind: 'progress' | 'passed' = 'progress'): SessionFields => {
    const data = new FormData(form);
    const evidence = [...data.entries()].filter(([key, value]) => key.startsWith('evidence:') && String(value).trim()).map(([key, value]) => ({ criterionId: key.slice(9), text: String(value).trim() }));
    return { taskId, fingerprint: form.dataset.fingerprint!, kind, evidence, continueFrom: String(data.get('continueFrom') || ''), lastAnchor: location.hash.slice(1) || String(data.get('lastAnchor') || '') };
  };
  const draft = readDraft(taskId);
  if (draft && draft.fingerprint === form.dataset.fingerprint) {
    const note = form.elements.namedItem('continueFrom');
    if (note instanceof HTMLTextAreaElement) note.value = draft.continueFrom;
    for (const item of draft.evidence) {
      const input = form.elements.namedItem(`evidence:${item.criterionId}`);
      if (input instanceof HTMLTextAreaElement) input.value = item.text;
    }
    announce(`session:${taskId}`, 'Draft dipulihkan', 'Draft lokal dipulihkan. Belum tersimpan sebagai sesi.');
  }
  form.addEventListener('input', () => { try { localStorage.setItem(`cs101:draft:${taskId}`, JSON.stringify(read())); } catch {} });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = (event as SubmitEvent).submitter as HTMLButtonElement | null;
    const buttons = form.querySelectorAll<HTMLButtonElement>('button');
    buttons.forEach((item) => item.disabled = true);
    announce(`session:${taskId}`, 'Menyimpan sesi', 'Perubahan sedang disimpan.');
    try {
      const state = await send('/api/sessions', { ...read(button?.value === 'passed' ? 'passed' : 'progress'), revision: Number(form.dataset.revision) });
      form.dataset.revision = String(state.revision);
      removeDraft(taskId);
      announce(`session:${taskId}`, 'Sesi tersimpan', 'Catatan sesi sudah tersimpan.', 'success');
    } catch (error) { announce(`session:${taskId}`, 'Sesi belum tersimpan', error instanceof Error ? error.message : 'Sesi belum tersimpan. Coba lagi.', 'danger'); }
    finally { buttons.forEach((item) => item.disabled = false); }
  });
});

document.querySelectorAll<HTMLButtonElement>('[data-activate]').forEach((button) => {
  const send = sender();
  button.addEventListener('click', async () => {
    button.disabled = true;
    announce(`activate:${button.dataset.activate}`, 'Mengubah task aktif', 'Progres sedang diperbarui.');
    try {
      const response = await fetch('/api/learning');
      if (!response.ok) throw new Error('Progres belum dapat dibaca. Coba lagi.');
      const state = await response.json();
      const previousSession = state.activeTaskId ? readDraft(state.activeTaskId) : undefined;
      await send('/api/active-task', { taskId: button.dataset.activate, revision: Number(button.dataset.revision), ...(previousSession ? { previousSession } : {}) });
      if (state.activeTaskId) removeDraft(state.activeTaskId);
      location.reload();
    } catch (error) { announce(`activate:${button.dataset.activate}`, 'Task belum diubah', error instanceof Error ? error.message : 'Task belum diubah.', 'danger'); button.disabled = false; }
  });
});
