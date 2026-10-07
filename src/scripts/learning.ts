import type { SessionFields } from '../domain/learning/schema';

function readDraft(itemId: string): SessionFields | undefined {
  try {
    return JSON.parse(localStorage.getItem(`cs101:draft:${itemId}`) || 'null') ?? undefined;
  } catch {
    return undefined;
  }
}

function removeDraft(itemId: string) {
  try { localStorage.removeItem(`cs101:draft:${itemId}`); } catch {}
}

function announce(
  scope: string,
  title: string,
  message: string,
  tone: 'info' | 'success' | 'warning' | 'danger' = 'info',
) {
  window.dispatchEvent(new CustomEvent('cs101:feedback', {
    detail: { scope, title, message, tone },
  }));
}

function sender() {
  let previous = '';
  let requestId = '';
  return async (path: string, input: object) => {
    const serialized = JSON.stringify({ path, input });
    if (serialized !== previous) {
      previous = serialized;
      requestId = crypto.randomUUID();
    }
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, requestId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Sesi belum tersimpan. Coba lagi.');
    previous = '';
    return data as { revision: number };
  };
}

document.querySelectorAll<HTMLFormElement>('.session-form').forEach((form) => {
  const itemId = form.dataset.itemId ?? form.dataset.taskId;
  if (!itemId) return;
  const send = sender();

  const read = (kind: 'progress' | 'passed' = 'progress'): SessionFields => {
    const data = new FormData(form);
    const evidence = [...data.entries()]
      .filter(([key, value]) => key.startsWith('evidence:') && String(value).trim())
      .map(([key, value]) => ({
        criterionId: key.slice(9),
        text: String(value).trim(),
      }));
    return {
      itemId,
      fingerprint: form.dataset.fingerprint!,
      kind,
      evidence,
      continueFrom: String(data.get('continueFrom') || ''),
      lastAnchor: location.hash.slice(1) || String(data.get('lastAnchor') || ''),
    };
  };

  const draft = readDraft(itemId);
  if (draft && draft.fingerprint === form.dataset.fingerprint) {
    const note = form.elements.namedItem('continueFrom');
    if (note instanceof HTMLTextAreaElement) note.value = draft.continueFrom;
    for (const entry of draft.evidence) {
      const input = form.elements.namedItem(`evidence:${entry.criterionId}`);
      if (input instanceof HTMLTextAreaElement) input.value = entry.text;
    }
    announce(`session:${itemId}`, 'Draft dipulihkan', 'Draft lokal dipulihkan. Belum tersimpan sebagai sesi.');
  }

  form.addEventListener('input', () => {
    try { localStorage.setItem(`cs101:draft:${itemId}`, JSON.stringify(read())); } catch {}
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = (event as SubmitEvent).submitter as HTMLButtonElement | null;
    const buttons = form.querySelectorAll<HTMLButtonElement>('button');
    buttons.forEach((entry) => entry.disabled = true);
    announce(`session:${itemId}`, 'Menyimpan sesi', 'Perubahan sedang disimpan.');
    try {
      const state = await send('/api/sessions', {
        ...read(button?.value === 'passed' ? 'passed' : 'progress'),
        revision: Number(form.dataset.revision),
      });
      form.dataset.revision = String(state.revision);
      removeDraft(itemId);
      announce(`session:${itemId}`, 'Sesi tersimpan', 'Catatan sesi sudah tersimpan.', 'success');
    } catch (error) {
      announce(
        `session:${itemId}`,
        'Sesi belum tersimpan',
        error instanceof Error ? error.message : 'Sesi belum tersimpan. Coba lagi.',
        'danger',
      );
    } finally {
      buttons.forEach((entry) => entry.disabled = false);
    }
  });
});

document.querySelectorAll<HTMLButtonElement>('[data-activate-item], [data-activate]').forEach((button) => {
  const itemId = button.dataset.activateItem ?? button.dataset.activate;
  if (!itemId) return;
  const send = sender();

  button.addEventListener('click', async () => {
    button.disabled = true;
    announce(`activate:${itemId}`, 'Mengubah item aktif', 'Progres sedang diperbarui.');
    try {
      const response = await fetch('/api/learning');
      if (!response.ok) throw new Error('Progres belum dapat dibaca. Coba lagi.');
      const state = await response.json();
      const previousItemId = state.activeItemId ?? state.activeTaskId;
      const previousSession = previousItemId ? readDraft(previousItemId) : undefined;
      await send('/api/active-item', {
        itemId,
        revision: Number(button.dataset.revision),
        ...(previousSession ? { previousSession } : {}),
      });
      if (previousItemId) removeDraft(previousItemId);
      location.reload();
    } catch (error) {
      announce(
        `activate:${itemId}`,
        'Item belum diubah',
        error instanceof Error ? error.message : 'Item belum diubah.',
        'danger',
      );
      button.disabled = false;
    }
  });
});
