"use client";

import { useMemo, useState, type FormEvent } from 'react';
import { Alert } from '../arc/alert/alert';
import { Button } from '../arc/button/button';
import { RadioGroup } from '../arc/radio-group/radio-group';

type ReviewQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
};

type Props = {
  itemId: string;
  version: string;
  revision: number;
  questions: ReviewQuestion[];
};

export default function ReviewAttempt({ itemId, version, revision, questions }: Props) {
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''));
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; assisted: boolean; result: 'passed' | 'again' }>();
  const [error, setError] = useState('');
  const complete = useMemo(() => answers.every((answer) => answer !== ''), [answers]);
  const assisted = revealed.size > 0;

  const submit = async (event: FormEvent) => {
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
          assisted,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Review belum tersimpan.');
      setResult(data.reviewAttempt);
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
        Score {result.score}/5{result.assisted ? ' · attempt assisted' : ''}.
        {result.result === 'passed'
          ? ' Review berikutnya sudah dijadwalkan.'
          : ' Completion tetap lulus. Pelajari bagian yang miss, lalu ulangi review.'}
      </Alert>
      <div className="actions">
        <a className="review-link" href="/">Kembali ke Hari ini</a>
        <a className="review-link" href={'/review/' + itemId}>Muat status review</a>
      </div>
    </div>;
  }

  return <form className="review-attempt" onSubmit={submit}>
    <div className="review-instruction">
      <strong>Recall dulu, baru reveal.</strong>
      <span>Reveal pada satu soal membuat seluruh attempt assisted dan tidak bisa lulus.</span>
    </div>

    {questions.map((question, index) => {
      const options = question.options.map((label, optionIndex) => ({
        value: String(optionIndex),
        label,
      }));
      const isRevealed = revealed.has(index);
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
        <Button
          type="button"
          variant="secondary"
          onClick={() => setRevealed((current) => new Set([...current, index]))}
          disabled={isRevealed}
        >
          {isRevealed ? 'Jawaban dibuka' : 'Reveal jawaban'}
        </Button>
        {isRevealed && (
          <Alert title={'Jawaban: ' + question.options[question.answer]} tone="info">
            {question.explanation}
          </Alert>
        )}
      </section>;
    })}

    {assisted && (
      <Alert title="Attempt assisted" tone="warning">
        Score tetap dicatat, tetapi attempt ini tidak dapat berstatus review passed.
      </Alert>
    )}
    {error && <Alert title="Review belum tersimpan" tone="danger">{error}</Alert>}

    <Button type="submit" variant="primary" disabled={!complete || submitting}>
      {submitting ? 'Menyimpan…' : 'Submit 5 jawaban'}
    </Button>
  </form>;
}
