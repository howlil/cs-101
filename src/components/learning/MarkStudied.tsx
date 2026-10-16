"use client";

import { navigate } from 'astro:transitions/client';
import { useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '../arc/button/button';
import { Alert } from '../arc/alert/alert';
import { postWithRevisionRetry } from './client';

export default function MarkStudied({ itemId, revision, studied, onCommitted }: {
  itemId: string; revision: number; studied: boolean; onCommitted?: (revision: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef<string | undefined>(undefined);
  const mark = async () => {
    if (loading || studied) return;
    setLoading(true);
    setError('');
    try {
      requestId.current ??= crypto.randomUUID();
      const saved = await postWithRevisionRetry<{ revision: number }>('/api/study', {
        requestId: requestId.current, revision, itemId, action: 'mark_studied',
      });
      requestId.current = undefined;
      onCommitted?.(saved.revision);
      navigate(window.location.href, { history: 'replace' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Progres belum tersimpan.');
      setLoading(false);
    }
  };
  return <section id="lesson-study-completion" tabIndex={-1} className="lesson-study-completion" aria-label="Progres belajar">
    <h2>Sudah mempelajari konsep ini?</h2>
    <p className="muted small">Tandai tanpa laporan atau textarea. Ini progres belajar, bukan sertifikasi kompetensi. Bukti teknis tetap opsional.</p>
    {studied ? <p><CheckCircle2 size={16} aria-hidden="true" /> Materi sudah dipelajari.</p> : (
      <Button type="button" variant="primary" loading={loading} disabled={loading} onClick={() => void mark()}>
        <CheckCircle2 size={15} aria-hidden="true" /><span>{loading ? 'Menyimpan…' : 'Tandai dipelajari'}</span>
      </Button>
    )}
    {error && <Alert title="Progres belum tersimpan" tone="danger">{error}</Alert>}
  </section>;
}
