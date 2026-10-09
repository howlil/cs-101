import { navigate } from 'astro:transitions/client';
"use client";

import { useRef, useState } from 'react';
import { Button, type ButtonVariant } from '../arc/button/button';
import { Dialog, DialogContent } from '../arc/dialog/dialog';
import { Play, RefreshCw } from 'lucide-react';
import { Alert, type AlertTone } from '../arc/alert/alert';
import type { SessionFields } from '../../domain/learning/schema';
import { hasSessionNotes, postJson, readDraft, removeDraft } from './client';

type LearningSnapshot = {
  activeItemId?: string | null;
  activeTaskId?: string | null;
  revision: number;
};
type PendingSwitch = { previousItemId: string; revision: number; previousSession: SessionFields };

export default function ActivateItem({
  itemId,
  label = 'Jadikan aktif',
  variant = 'primary',
  targetHref,
}: {
  itemId: string;
  label?: string;
  variant?: ButtonVariant;
  targetHref?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingSwitch>();
  const [feedback, setFeedback] = useState<{ title: string; message: string; tone: AlertTone }>();
  const request = useRef<{ key: string; id: string } | undefined>(undefined);

  const commit = async (revision: number, previousItemId?: string, previousSession?: SessionFields) => {
    setLoading(true);
    setFeedback({ title: 'Mengubah item aktif', message: 'Progres sedang diperbarui.', tone: 'info' });
    try {
      const input = { itemId, revision, ...(previousSession ? { previousSession } : {}) };
      const key = JSON.stringify(input);
      if (!request.current || request.current.key !== key) {
        request.current = { key, id: crypto.randomUUID() };
      }
      await postJson('/api/active-item', { ...input, requestId: request.current.id });
      request.current = undefined;
      // Never discard a draft when the user chose to switch without saving it.
      if (previousSession && previousItemId) removeDraft(previousItemId);
      setPending(undefined);
      navigate(targetHref ?? window.location.href, { history: targetHref ? 'push' : 'replace' });
    } catch (error) {
      setFeedback({
        title: 'Item belum diubah',
        message: error instanceof Error ? error.message : 'Item belum diubah.',
        tone: 'danger',
      });
      setLoading(false);
    }
  };

  const activate = async () => {
    if (loading) return;
    setLoading(true);
    setFeedback(undefined);
    try {
      const stateResponse = await fetch('/api/learning', { headers: { Accept: 'application/json' } });
      if (!stateResponse.ok) throw new Error('Progres belum dapat dibaca. Coba lagi.');
      const state = await stateResponse.json() as LearningSnapshot;
      const previousItemId = state.activeItemId ?? state.activeTaskId ?? undefined;
      const previousSession = previousItemId && previousItemId !== itemId
        ? readDraft(previousItemId) : undefined;

      if (previousSession && hasSessionNotes(previousSession) && previousItemId) {
        setPending({ previousItemId, previousSession, revision: state.revision });
        setLoading(false);
        return;
      }
      await commit(state.revision);
    } catch (error) {
      setFeedback({
        title: 'Item belum diubah',
        message: error instanceof Error ? error.message : 'Item belum diubah.',
        tone: 'danger',
      });
      setLoading(false);
    }
  };

  return <div className="react-action-stack">
    <Button type="button" variant={variant} loading={loading} onClick={activate}>
      {label.toLocaleLowerCase('id-ID').includes('validasi')
        ? <RefreshCw size={15} strokeWidth={1.8} aria-hidden="true" />
        : <Play size={15} strokeWidth={1.8} aria-hidden="true" />}
      <span>{loading ? 'Memperbarui…' : label}</span>
    </Button>
    {feedback && !pending && (
      <Alert open title={feedback.title} tone={feedback.tone}>{feedback.message}</Alert>
    )}
    <Dialog open={Boolean(pending)} onOpenChange={(open) => {
      if (!open && !loading) setPending(undefined);
    }}>
      <DialogContent
        title="Ada draft yang belum disimpan"
        description="Pilih apa yang dilakukan dengan catatan item sebelumnya."
      >
        <div className="draft-switch-actions">
          <Button type="button" variant="primary" disabled={loading}
            onClick={() => pending && void commit(pending.revision, pending.previousItemId, pending.previousSession)}>
            Simpan sesi & ganti
          </Button>
          <Button type="button" variant="secondary" disabled={loading}
            onClick={() => pending && void commit(pending.revision)}>
            Ganti tanpa simpan sesi
          </Button>
          <Button type="button" variant="ghost" disabled={loading} onClick={() => setPending(undefined)}>
            Batal
          </Button>
        </div>
        <p className="muted small">Jika tidak disimpan sebagai sesi, draft lokal tetap tersedia saat item sebelumnya dibuka lagi.</p>
        {feedback?.tone === 'danger' && (
          <Alert title={feedback.title} tone="danger">{feedback.message}</Alert>
        )}
      </DialogContent>
    </Dialog>
  </div>;
}
