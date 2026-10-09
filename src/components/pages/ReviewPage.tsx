"use client";

import { useState } from 'react';
import {
  ArrowLeft,
  BrainCircuit,
  Check,
  Circle,
  CircleDot,
} from 'lucide-react';
import ActionLink from '../ui/ActionLink';
import EmptyAction from '../ui/EmptyAction';
import { Alert } from '../arc/alert/alert';
import { Accordion } from '../arc/accordion/accordion';
import ReviewAttempt from '../course/ReviewAttempt';

const REVIEW_DAYS = [1, 3, 7, 14, 30] as const;

type PublicQuestion = { id: string; prompt: string; options: string[] };

function ReviewSchedule({
  step,
  state,
}: {
  step: number;
  state: 'scheduled' | 'due' | 'retry' | 'retained';
}) {
  return <div className="retention-steps retention-steps--large" aria-label="Jadwal review">
    {REVIEW_DAYS.map((day, index) => {
      const done = state === 'retained' || index < step;
      const current = state !== 'retained' && index === step;
      return <span key={day} className={done ? 'is-done' : current ? 'is-current' : ''}>
        {done ? <Check size={11} strokeWidth={2} aria-hidden="true" /> : current ? <CircleDot size={11} strokeWidth={2} aria-hidden="true" /> : <Circle size={11} strokeWidth={1.8} aria-hidden="true" />}
        Hari {day}
      </span>;
    })}
  </div>;
}

export default function ReviewPage({
  itemId,
  title,
  itemHref,
  completion,
  review,
  bank,
  revision,
}: {
  itemId: string;
  title: string;
  itemHref: string;
  completion: 'passed' | 'stale' | 'other';
  review?: { state: 'scheduled' | 'due' | 'retry' | 'retained'; step: number; dueAt: string | null };
  bank?: { version: string; current: boolean; questions: PublicQuestion[] };
  revision: number;
}) {
  const [currentReview, setCurrentReview] = useState(review);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const canAttempt = currentReview?.state === 'due' || currentReview?.state === 'retry';
  const nextDate = currentReview?.dueAt ? new Date(currentReview.dueAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) : undefined;

  return <article className="review-workspace">
    <header className="review-header">
      <a className="review-back" href={itemHref}>
        <ArrowLeft size={14} strokeWidth={1.8} aria-hidden="true" />
        <span>Kembali ke materi</span>
      </a>
      <p className="eyebrow"><BrainCircuit size={13} strokeWidth={1.8} aria-hidden="true" /> REVIEW · {itemId}</p>
      <h1>{title}</h1>
      <p className="review-instruction-line">5 pertanyaan · jawab tanpa membuka catatan.</p>
    </header>

    {completion !== 'passed' ? (
      <EmptyAction
        title={completion === 'stale' ? 'Materi perlu diperbarui dulu.' : 'Materi belum selesai.'}
        description="Review tersedia setelah semua target selesai memiliki bukti."
        href={itemHref}
        actionLabel="Buka materi"
      />
    ) : !currentReview ? (
      <EmptyAction
        title="Review belum dijadwalkan."
        description="Jadwal dibuat otomatis setelah materi selesai."
        href="/progress"
        actionLabel="Buka progres"
      />
    ) : (
      <div className="review-body">
        <aside className="review-sidecar" aria-label="Status review">
          <section className="review-summary">
            <span className="eyebrow">STATUS</span>
            <strong>
              {currentReview.state === 'retry'
                ? 'Perlu diulang'
                : currentReview.state === 'due'
                  ? 'Review hari ini'
                  : currentReview.state === 'retained'
                    ? 'Review selesai'
                    : 'Review berikutnya'}
            </strong>
            {currentReview.state === 'scheduled' && nextDate && <span>{nextDate}</span>}
          </section>

          <Accordion
            defaultOpen={-1}
            size="sm"
            items={[{
              title: 'Lihat jadwal review',
              content: <ReviewSchedule step={currentReview.step} state={currentReview.state} />,
            }]}
          />
        </aside>

        <section className="review-main">
          {reviewSubmitted && bank?.current ? (
            <ReviewAttempt
              itemId={itemId}
              version={bank.version}
              revision={revision}
              questions={bank.questions}
              onReviewed={(schedule) => {
                setCurrentReview(schedule);
                setReviewSubmitted(true);
              }}
            />
          ) : currentReview.state === 'retained' ? (
            <Alert title="Review selesai" tone="success">
              Semua jadwal review untuk materi ini sudah dilewati.
            </Alert>
          ) : currentReview.state === 'scheduled' ? (
            <Alert title="Belum waktunya review" tone="info">
              {nextDate ? 'Review berikutnya: ' + nextDate + '.' : 'Tanggal review berikutnya belum ditentukan.'}
            </Alert>
          ) : !bank ? (
            <EmptyAction
              title="Soal review belum tersedia."
              description="Materi tetap selesai. Buka materi untuk mengulang bagian penting sementara soal review disiapkan."
              href={itemHref}
              actionLabel="Buka materi"
            />
          ) : !bank.current ? (
            <EmptyAction
              title="Soal review perlu diperbarui."
              description="Soal masih memakai versi materi lama."
              href={itemHref}
              actionLabel="Buka materi terbaru"
            />
          ) : canAttempt ? (
            <ReviewAttempt
              itemId={itemId}
              version={bank.version}
              revision={revision}
              questions={bank.questions}
              onReviewed={(schedule) => {
                setCurrentReview(schedule);
                setReviewSubmitted(true);
              }}
            />
          ) : (
            <ActionLink href={itemHref} label="Kembali ke materi" />
          )}
        </section>
      </div>
    )}
  </article>;
}
