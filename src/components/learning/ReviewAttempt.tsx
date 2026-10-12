"use client";

import { useMemo, useState, type SyntheticEvent } from 'react';
import { Alert } from '../arc/alert/alert';
import { Button } from '../arc/button/button';
import { RadioGroup } from '../arc/radio-group/radio-group';
import ActionLink from '../ui/ActionLink';
import { Send } from 'lucide-react';

type PublicReviewQuestion = {
  id: string;
  prompt: string;
  options: string[];
};

type ReviewFeedback = {
  id: string;
  correct: boolean;
  answer: number;
  explanation: string;
};

type ReviewSchedule = {
  itemId: string;
  state: 'scheduled' | 'due' | 'retry' | 'retained';
  step: number;
  dueAt: string | null;
};

type ReviewResponse = {
  reviewAttempt: { score: number; assisted: boolean; result: 'passed' | 'again' };
  reviewFeedback: ReviewFeedback[];
  reviews: ReviewSchedule[];
  error?: string;
};

type Props = {
  itemId: string;
  version: string;
  revision: number;
  questions: PublicReviewQuestion[];
  onReviewed?: (schedule: ReviewSchedule) => void;
};

export default function ReviewAttempt({ itemId, version, revision, questions, onReviewed }: Props) {
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; assisted: boolean; result: 'passed' | 'again' }>();
  const [feedback, setFeedback] = useState<ReviewFeedback[]>([]);
  const [nextReview, setNextReview] = useState<ReviewSchedule>();
  const [error, setError] = useState('');
  const answeredCount = useMemo(() => answers.filter((answer) => answer !== '').length, [answers]);
  const complete = answeredCount === questions.length;

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!complete || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          revision,
          itemId,
          questionSetVersion: version,
          answers: answers.map(Number),
          assisted: false,
        }),
      });
      const data = await response.json() as ReviewResponse;
      if (!response.ok) throw new Error(data.error || 'Review belum tersimpan.');
      setResult(data.reviewAttempt);
      setFeedback(data.reviewFeedback ?? []);
      const updated = data.reviews?.find((entry) => entry.itemId === itemId);
      if (updated) {
        setNextReview(updated);
        onReviewed?.(updated);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Review belum tersimpan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return <div className="review-result">
      <Alert
        title={result.score + ' dari 5 benar'}
        tone={result.result === 'passed' ? 'success' : 'warning'}
      >
        {result.result === 'passed'
          ? 'Review selesai. Review berikutnya sudah dijadwalkan.'
          : (5 - result.score) + ' bagian belum tepat. Materi tetap selesai. Pelajari pembahasan di bawah lalu ulangi review.'}
      </Alert>

      {nextReview && <p className="review-next-state">
        {nextReview.state === 'retained' ? 'Semua jadwal review sudah selesai.'
          : nextReview.state === 'retry' ? 'Bisa mencoba review lagi sekarang.'
          : nextReview.dueAt
            ? 'Review berikutnya: ' + new Date(nextReview.dueAt).toLocaleDateString('id-ID', {
              day: 'numeric', month: 'long', year: 'numeric',
            }) + '.'
            : 'Status review telah diperbarui.'}
      </p>}

      <div className="review-feedback-list">
        {questions.map((question, index) => {
          const itemFeedback = feedback.find((entry) => entry.id === question.id);
          if (!itemFeedback) return null;
          return <section className="review-feedback" key={question.id}>
            <div>
              <strong>{itemFeedback.correct ? 'Benar' : 'Belum tepat'} · {String(index + 1).padStart(2, '0')}</strong>
              <span>{question.prompt}</span>
            </div>
            {!itemFeedback.correct && (
              <p>
                Jawaban yang benar: <strong>{question.options[itemFeedback.answer]}</strong>. {itemFeedback.explanation}
              </p>
            )}
          </section>;
        })}
      </div>

      <div className="actions">
        <ActionLink href="/" label="Kembali ke Hari ini" />
        {result.result === 'again' && <ActionLink href={'/review/' + itemId} label="Ulangi review" />}
      </div>
    </div>;
  }

  return <form className="review-attempt" onSubmit={submit}>
    <div className="review-instruction">
      <strong>Jawab tanpa membuka catatan.</strong>
      <span>Pembahasan muncul setelah semua jawaban dikirim.</span>
    </div>

    {questions.map((question, index) => {
      const options = question.options.map((label, optionIndex) => ({
        value: String(optionIndex),
        label,
      }));
      return <section className="review-question" key={question.id}>
        <div className="review-question-index">{String(index + 1).padStart(2, '0')}</div>
        <RadioGroup
          label={question.prompt}
          name={'review-' + question.id}
          options={options}
          value={answers[index]}
          onValueChange={(value) => {
            setAnswers((current) => current.map((answer, i) => i === index ? value : answer));
          }}
        />
      </section>;
    })}

    {error && <Alert title="Review belum tersimpan" tone="danger">{error}</Alert>}

    <p className="review-answer-count" role="status">{answeredCount} dari {questions.length} pertanyaan terjawab</p>
    <Button type="submit" variant="primary" disabled={!complete || submitting}>
      <Send size={15} strokeWidth={1.8} aria-hidden="true" />
      <span>{submitting ? 'Menyimpan…' : 'Kirim jawaban'}</span>
    </Button>
  </form>;
}
