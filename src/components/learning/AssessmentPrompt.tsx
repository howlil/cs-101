"use client";
import { useEffect, useRef, useState } from 'react';
import type { AssessmentPlan } from '../../domain/learning/assessment';
import { Button } from '../arc/button/button';
import { RadioGroup } from '../arc/radio-group/radio-group';
import { Alert } from '../arc/alert/alert';
import { postJson, MutationError } from './client';

type Feedback = {
  correct: boolean;
  explanation: string;
  misconception: string | null;
  nextAction: 'retry_with_feedback' | 'review_scheduled';
};
type Response = { revision: number; assessment: Feedback };

export default function AssessmentPrompt({ plan, revision, onCommitted }: {
  plan: AssessmentPlan; revision: number; onCommitted?: (revision: number) => void;
}) {
  const [answer, setAnswer] = useState('');
  const [currentPlan, setCurrentPlan] = useState(plan);
  useEffect(() => { setCurrentPlan(plan); }, [plan]);

  const [feedback, setFeedback] = useState<Feedback>();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const requestRef = useRef<{ signature: string; id: string } | undefined>(undefined);
  const advance = async () => {
    setSubmitting(true); setError('');
    try {
      const response = await fetch('/api/learning-plan?itemId=' + encodeURIComponent(currentPlan.itemId), { cache: 'no-store' });
      if (!response.ok) throw new Error('Langkah berikutnya belum tersedia.');
      setCurrentPlan(await response.json() as AssessmentPlan);
      setFeedback(undefined); setAnswer(''); requestRef.current = undefined;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Belum bisa memuat latihan berikutnya.');
    } finally { setSubmitting(false); }
  };
  if (currentPlan.kind === 'unavailable') return null;
  if (!('question' in currentPlan)) return <section id="lesson-assessment" tabIndex={-1} className="lesson-assessment">
    <strong>{currentPlan.kind === 'needs_support' ? 'Perlu penguatan konsep' : 'Pemahaman dasar sudah diuji.'}</strong>
    <p>{currentPlan.kind === 'needs_support'
      ? 'Latihan variasi belum cukup. Periksa penjelasan dan coba implementasi SQL secara mandiri; tidak ada kewajiban mengulang form.'
      : 'Review berikutnya dijadwalkan terpisah. Kamu bisa lanjut menerapkan konsep tanpa mengisi laporan.'}</p>
    {currentPlan.kind === 'waiting' && currentPlan.dueAt && <p className="muted small">Micro-recall: {new Date(currentPlan.dueAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>}
  </section>;

  const { question } = currentPlan;
  const submit = async () => {
    if (!answer || submitting || feedback?.correct) return;
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        itemId: currentPlan.itemId, assessmentId: question.id,
        assessmentVersion: question.version, phase: currentPlan.kind,
        answer: Number(answer), revision,
      };
      const signature = JSON.stringify(payload);
      if (requestRef.current?.signature !== signature) {
        requestRef.current = { signature, id: crypto.randomUUID() };
      }
      let result: Response;
      try {
        result = await postJson<Response>('/api/assessment-attempts', {
          ...payload, requestId: requestRef.current.id,
        });
      } catch (cause) {
        // An Astro hash navigation can retain an older SSR revision. A stale
        // write must be rejected by the server; reconcile once without asking
        // the learner to re-answer. Never replay if the planned task changed.
        if (!(cause instanceof MutationError) || cause.code !== 'REVISION_CONFLICT') throw cause;
        const [stateResponse, planResponse] = await Promise.all([
          fetch('/api/learning', { cache: 'no-store' }),
          fetch('/api/learning-plan?itemId=' + encodeURIComponent(currentPlan.itemId), { cache: 'no-store' }),
        ]);
        if (!stateResponse.ok || !planResponse.ok) throw cause;
        const fresh = await stateResponse.json() as { revision: number };
        const latestPlan = await planResponse.json() as AssessmentPlan;
        if (latestPlan.kind !== currentPlan.kind || !('question' in latestPlan) || latestPlan.question.id !== question.id) {
          setCurrentPlan(latestPlan);
          setFeedback(undefined); setAnswer('');
          return;
        }
        // The rejected revision never committed; a new payload requires a new
        // receipt ID. One retry only, so repeated conflicts remain visible.
        requestRef.current = {
          signature: JSON.stringify({ ...payload, revision: fresh.revision }),
          id: crypto.randomUUID(),
        };
        result = await postJson<Response>('/api/assessment-attempts', {
          ...payload, revision: fresh.revision, requestId: requestRef.current.id,
        });
      }
      requestRef.current = undefined;
      onCommitted?.(result.revision);
      setFeedback(result.assessment);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Jawaban belum tersimpan.');
    } finally {
      setSubmitting(false);
    }
  };
  return <section id="lesson-assessment" tabIndex={-1} className="lesson-assessment" aria-label={currentPlan.kind === 'recall' ? 'Micro-recall' : 'Cek pemahaman'} >
    <p className="eyebrow">{currentPlan.kind === 'recall' ? 'RECALL · tanpa catatan' : currentPlan.kind === 'transfer' ? 'TRANSFER · soal variasi' : 'PREDICT · cek pemahaman'}</p>
    <h3>{question.prompt}</h3>
    {!feedback && <>
      <RadioGroup label="Pilih hasil prediksi" name={'assessment-' + question.id}
        options={question.options.map((label, index) => ({ label, value: String(index) }))}
        value={answer} onValueChange={setAnswer} />
      <Button type="button" variant="primary" disabled={!answer || submitting}
        loading={submitting} onClick={() => void submit()}>
        {submitting ? 'Memeriksa…' : 'Cek prediksi'}
      </Button>
    </>}
    {feedback && <div role="status">
      <Alert title={feedback.correct ? 'Prediksi tepat' : 'Perbaiki mental model'}
        tone={feedback.correct ? 'success' : 'warning'}>
        {feedback.misconception && <p>{feedback.misconception}</p>}
        <p>{feedback.explanation}</p>
      </Alert>
      <Button type="button" variant="secondary" disabled={submitting} onClick={() => void advance()}>
        {feedback.correct ? 'Lihat langkah berikutnya' : 'Coba soal berbeda'}</Button>
    </div>}
    {error && <Alert title="Belum tersimpan" tone="danger">{error}</Alert>}
    <p className="muted small">Jawaban tersimpan otomatis; tidak diperlukan form bukti atau aktivasi materi.</p>
  </section>;
}
