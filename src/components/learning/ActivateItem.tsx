"use client";

import { useRef, useState } from 'react';
import { Button, type ButtonVariant } from '../arc/button/button';
import { Play, RefreshCw } from 'lucide-react';
import { Alert, type AlertTone } from '../arc/alert/alert';
import { postJson, readDraft, removeDraft } from './client';

type LearningSnapshot = {
  activeItemId?: string | null;
  activeTaskId?: string | null;
  revision: number;
};

export default function ActivateItem({
  itemId,
  label = 'Jadikan aktif',
  variant = 'primary',
}: {
  itemId: string;
  label?: string;
  variant?: ButtonVariant;
}) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string; tone: AlertTone }>();
  const requestId = useRef<string | undefined>(undefined);

  const activate = async () => {
    if (loading) return;
    setLoading(true);
    setFeedback({ title: 'Mengubah item aktif', message: 'Progres sedang diperbarui.', tone: 'info' });

    try {
      const stateResponse = await fetch('/api/learning', { headers: { Accept: 'application/json' } });
      if (!stateResponse.ok) throw new Error('Progres belum dapat dibaca. Coba lagi.');
      const state = await stateResponse.json() as LearningSnapshot;
      const previousItemId = state.activeItemId ?? state.activeTaskId ?? undefined;
      const previousSession = previousItemId ? readDraft(previousItemId) : undefined;
      requestId.current ??= crypto.randomUUID();

      await postJson('/api/active-item', {
        requestId: requestId.current,
        itemId,
        revision: state.revision,
        ...(previousSession ? { previousSession } : {}),
      });

      if (previousItemId) removeDraft(previousItemId);
      window.location.reload();
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
    {feedback && (
      <Alert open title={feedback.title} tone={feedback.tone}>
        {feedback.message}
      </Alert>
    )}
  </div>;
}
