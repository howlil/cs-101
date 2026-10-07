"use client";

import { useMemo, useState, type SyntheticEvent } from 'react';
import { Alert } from '../arc/alert/alert';
import { Button } from '../arc/button/button';
import { RadioGroup } from '../arc/radio-group/radio-group';
import ActionLink from '../arc/ActionLink';
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

type Props = {
  itemId: string;
  version: string;
  revision: number;
  questions: PublicReviewQuestion[];
};

export default function ReviewAttempt({ itemId, version, revision, questions }: Props) {
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; assisted: boolean; result: 'passed' | 'again' }>();
  const [feedback, setFeedback] = useState<ReviewFeedback[]>([]);
  const [error, setError] = useState('');
  const complete = useMemo(() => answers.every((answer) => answer !== ''), [answers]);

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
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Review belum tersimpan.');
      setResult(data.reviewAttempt);
      setFeedback(data.reviewFeedback ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Review belum tersimpan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return <div className="review-result">
      <Alert
        title={result.result === 'passed' ? 'Review lulus.' : 'Review perlu diulang.'}
        tone={result.result === 'passed' ? 'success' : 'warning'}
      >
        Score {result.score}/5.
        {result.result === 'passed'
          ? ' Review berikutnya sudah dijadwalkan.'
          : ' Completion tetap lulus. Pelajari bagian yang miss, lalu ulangi review.'}
      </Alert>

      <div className="review-feedback-list">
        {questions.map((question, index) => {
          const itemFeedback = feedback.find((entry) => entry.id === question.id);
          if (!itemFeedback) return null;
          return <section className="review-feedback" key={question.id}>
            <div>
              <strong>{itemFeedback.correct ? 'Benar' : 'Miss'} · {String(index + 1).padStart(2, '0')}</strong>
              <span>{question.prompt}</span>
            </div>
            {!itemFeedback.correct && (
              <p>
                Jawaban: <strong>{question.options[itemFeedback.answer]}</strong>. {itemFeedback.explanation}
              </p>
            )}
          </section>;
        })}
      </div>

      <div className="actions">
        <ActionLink href="/" label="Kembali ke Hari ini" />
        <ActionLink href={'/review/' + itemId} label="Muat status review" />
      </div>
    </div>;
  }

  return <form className="review-attempt" onSubmit={submit}>
    <div className="review-instruction">
      <strong>Recall tanpa membuka materi.</strong>
      <span>Jawaban dan remediation baru ditampilkan setelah seluruh attempt disubmit.</span>
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

    <Button type="submit" variant="primary" disabled={!complete || submitting}>
      <Send size={15} strokeWidth={1.8} aria-hidden="true" />
      <span>{submitting ? 'Menyimpan…' : 'Submit 5 jawaban'}</span>
    </Button>
  </form>;
}
