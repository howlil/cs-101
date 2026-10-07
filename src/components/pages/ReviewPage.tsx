"use client";

import {
  ArrowLeft,
  BrainCircuit,
  RotateCcw,
  ShieldCheck,
  Check,
  Circle,
  CircleDot,
} from 'lucide-react';
import ActionLink from '../ui/ActionLink';
import EmptyAction from '../ui/EmptyAction';
import { Alert } from '../arc/alert/alert';
import { Badge } from '../arc/badge/badge';
import ReviewAttempt from '../course/ReviewAttempt';

const REVIEW_DAYS = [1, 3, 7, 14, 30] as const;

type PublicQuestion = { id: string; prompt: string; options: string[] };

function RetentionTimeline({
  step,
  state,
}: {
  step: number;
  state: 'scheduled' | 'due' | 'retry' | 'retained';
}) {
  return <section className="review-retention">
    <div>
      <p className="eyebrow">RETENTION</p>
      <h2>Jadwal penguatan ingatan</h2>
    </div>
    <div className="retention-steps retention-steps--large">
      {REVIEW_DAYS.map((day, index) => {
        const done = state === 'retained' || index < step;
        const current = state !== 'retained' && index === step;
        return <span key={day} className={done ? 'is-done' : current ? 'is-current' : ''}>
          {done ? <Check size={11} strokeWidth={2} aria-hidden="true" /> : current ? <CircleDot size={11} strokeWidth={2} aria-hidden="true" /> : <Circle size={11} strokeWidth={1.8} aria-hidden="true" />}Hari {day}
        </span>;
      })}
    </div>
  </section>;
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
  const canAttempt = review?.state === 'due' || review?.state === 'retry';

  return <article className="review-workspace">
    <header className="review-header">
      <a className="review-back" href={itemHref}>
        <ArrowLeft size={14} strokeWidth={1.8} aria-hidden="true" />
        <span>Kembali ke materi</span>
      </a>
      <p className="eyebrow"><BrainCircuit size={13} strokeWidth={1.8} aria-hidden="true" /> {itemId} / REVIEW</p>
      <h1>{title}</h1>
      <p className="lede">Jawab tanpa membuka catatan. Tujuannya mengecek apakah pemahaman masih bisa dipanggil kembali.</p>
    </header>

    {completion !== 'passed' ? (
      <EmptyAction
        title={completion === 'stale' ? 'Materi perlu divalidasi ulang.' : 'Item belum selesai.'}
        description="Review tersedia setelah semua target selesai memiliki bukti."
        href={itemHref}
        actionLabel="Buka materi"
      />
    ) : !review ? (
      <EmptyAction
        title="Review belum terjadwal."
        description="Jadwal dibuat ketika item pertama kali selesai."
        href="/progress"
        actionLabel="Buka progres"
      />
    ) : (
      <>
        <RetentionTimeline step={review.step} state={review.state} />

        {review.state === 'retained' ? (
          <Alert title="Teringat" tone="success">
            Semua tahap review 1, 3, 7, 14, dan 30 hari sudah dilewati.
          </Alert>
        ) : review.state === 'scheduled' ? (
          <Alert title="Belum waktunya review" tone="info">
            {review.dueAt
              ? 'Review berikutnya: ' + new Date(review.dueAt).toLocaleString('id-ID')
              : 'Tanggal review berikutnya belum ditentukan.'}
          </Alert>
        ) : !bank ? (
          <EmptyAction
            title="Set review belum tersedia."
            description="Review sudah jatuh tempo, tetapi bank soal untuk item ini belum dibuat."
            href={itemHref}
            actionLabel="Buka materi"
          />
        ) : !bank.current ? (
          <EmptyAction
            title="Set review perlu diperbarui."
            description="Bank soal masih memakai versi kurikulum lama."
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
                {review.state === 'retry' ? 'Perlu diulang' : 'Review hari ini'}
              </Badge>
              <span>Tahap {review.step + 1} dari {REVIEW_DAYS.length}</span>
            </section>
            <ReviewAttempt
              itemId={itemId}
              version={bank.version}
              revision={revision}
              questions={bank.questions}
            />
          </>
        ) : (
          <ActionLink href={itemHref} label="Kembali ke materi" />
        )}
      </>
    )}
  </article>;
}
