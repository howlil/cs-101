"use client";
import { useRef, useState } from 'react';
import { navigate } from 'astro:transitions/client';
import type { AssessmentPlan } from '../../domain/learning/assessment';
import { Button } from '../arc/button/button';
import { RadioGroup } from '../arc/radio-group/radio-group';
import { Alert } from '../arc/alert/alert';
import { postJson } from './client';

type Feedback = {
  correct: boolean;
  explanation: string;
  misconception: string | null;
  nextAction: 'retry_with_feedback' | 'review_scheduled';
};
type Response = { revision: number; assessment: Feedback };

export default function AssessmentPrompt({ plan, revision }: {
  plan: AssessmentPlan; revision: number;
}) {
  const [answer, setAnswer] = useState('');
  const [currentRevision, setCurrentRevision] = useState(revision);
  const [feedback, setFeedback] = useState<Feedback>();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const requestRef = useRef<{ signature: string; id: string } | undefined>(undefined);
  if (plan.kind === 'unavailable') return null;
  if (!('question' in plan)) return <section id="lesson-assessment" tabIndex={-1} className="lesson-assessment">
    <strong>Pemahaman dasar sudah diuji.</strong>
    <p>Review berikutnya dijadwalkan terpisah. Kamu bisa lanjut menerapkan konsep tanpa mengisi laporan.</p>
    {plan.dueAt && <p className="muted small">Micro-recall: {new Date(plan.dueAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>}
  </section>;

  const { question } = plan;
  const submit = async () => {
    if (!answer || submitting || feedback?.correct) return;
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        itemId: plan.itemId, assessmentId: question.id,
        assessmentVersion: question.version, phase: plan.kind,
        answer: Number(answer), revision: currentRevision,
      };
      const signature = JSON.stringify(payload);
      if (requestRef.current?.signature !== signature) {
        requestRef.current = { signature, id: crypto.randomUUID() };
      }
      const next = await postJson<Response>('/api/assessment-attempts', {
        ...payload, requestId: requestRef.current.id,
      });
      requestRef.current = undefined;
      setCurrentRevision(next.revision);
      setFeedback(next.assessment);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Jawaban belum tersimpan.');
    } finally {
      setSubmitting(false);
    }
  };
  const retry = () => { setFeedback(undefined); setAnswer(''); setError(''); };
  return <section id="lesson-assessment" tabIndex={-1} className="lesson-assessment" aria-label={plan.kind === 'recall' ? 'Micro-recall' : 'Cek pemahaman'} >
    <p className="eyebrow">{plan.kind === 'recall' ? 'RECALL · tanpa catatan' : 'PREDICT · cek pemahaman'}</p>
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
      <Button type="button" variant="secondary" onClick={() => {
        if (feedback.correct) navigate(window.location.href, { history: 'replace' });
        else retry();
      }}>{feedback.correct ? 'Lihat langkah berikutnya' : 'Coba lagi'}</Button>
    </div>}
    {error && <Alert title="Belum tersimpan" tone="danger">{error}</Alert>}
    <p className="muted small">Jawaban tersimpan otomatis; tidak diperlukan form bukti atau aktivasi materi.</p>
  </section>;
}
