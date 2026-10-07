"use client";

import {
  ArrowLeft,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import ActionLink from '../arc/ActionLink';
import EmptyAction from '../arc/EmptyAction';
import { Badge } from '../arc/badge/badge';
import { Card } from '../arc/card/card';
import ReviewAttempt from '../course/ReviewAttempt';

type PublicQuestion = { id: string; prompt: string; options: string[] };

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
  const canAttempt = review?.state === 'due' || review?.state === 'retry';

  return <article className="review-workspace">
    <header className="review-header">
      <a className="review-back" href={itemHref}>
        <ArrowLeft size={14} strokeWidth={1.8} aria-hidden="true" />
        <span>Kembali ke item</span>
      </a>
      <p className="eyebrow"><BrainCircuit size={13} strokeWidth={1.8} aria-hidden="true" /> {itemId} / REVIEW</p>
      <h1>{title}</h1>
      <p className="lede">Recall-first. Completion dan review adalah dua state yang berbeda.</p>
    </header>

    {completion !== 'passed' ? (
      <EmptyAction
        title={completion === 'stale' ? 'Completion perlu divalidasi ulang.' : 'Item belum lulus.'}
        description="Review hanya tersedia setelah item lulus terhadap curriculum aktif."
        href={itemHref}
        actionLabel="Buka item"
      />
    ) : !review ? (
      <EmptyAction
        title="Review belum terjadwal."
        description="Schedule dibuat ketika item pertama kali lulus."
        href="/progress"
        actionLabel="Buka progres"
      />
    ) : review.state === 'retained' ? (
      <Card
        title="Retained"
        description="Seluruh interval review v1 sudah dilewati."
        meta={<CheckCircle2 size={15} strokeWidth={1.8} aria-hidden="true" />}
        status="Retention"
      />
    ) : review.state === 'scheduled' ? (
      <Card
        title="Belum jatuh tempo"
        description={review.dueAt
          ? 'Review berikutnya: ' + new Date(review.dueAt).toLocaleString('id-ID')
          : 'Tanggal review berikutnya belum ditentukan.'}
        meta={<CalendarClock size={15} strokeWidth={1.8} aria-hidden="true" />}
        status="Scheduled"
      />
    ) : !bank ? (
      <EmptyAction
        title="Review set belum tersedia."
        description="Schedule sudah due, tetapi assessment bank terstruktur untuk item ini belum dibuat."
        href={itemHref}
        actionLabel="Buka materi"
      />
    ) : !bank.current ? (
      <EmptyAction
        title="Review set perlu diperbarui."
        description="Assessment bank masih memakai fingerprint curriculum lama."
        href={itemHref}
        actionLabel="Buka materi terbaru"
      />
    ) : canAttempt ? (
      <>
        <section className="review-status-line">
          <Badge
            tone={review.state === 'retry' ? 'warning' : 'info'}
            icon={review.state === 'retry'
              ? <RotateCcw size={13} strokeWidth={1.8} />
              : <ShieldCheck size={13} strokeWidth={1.8} />}
          >
            {review.state === 'retry' ? 'Retry' : 'Due'}
          </Badge>
          <span>Interval step {review.step + 1}</span>
        </section>
        <ReviewAttempt
          itemId={itemId}
          version={bank.version}
          revision={revision}
          questions={bank.questions}
        />
      </>
    ) : (
      <ActionLink href={itemHref} label="Kembali ke item" />
    )}
  </article>;
}
