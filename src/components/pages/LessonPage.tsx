"use client";

import type { ReactNode } from 'react';
import { BookOpen, ListTree, TriangleAlert } from 'lucide-react';
import type { Criterion } from '../../domain/curriculum-v2/schema';
import { Alert } from '../arc/alert/alert';
import { Accordion } from '../arc/accordion/accordion';
import EmptyAction from '../arc/EmptyAction';
import ActivateItem from '../learning/ActivateItem';
import SessionLogger from '../course/SessionLogger';
import ConnectionsPanel, { type ConnectionGroupData } from '../curriculum/ConnectionsPanel';

export default function LessonPage({
  itemId,
  title,
  description,
  marketExpectation,
  nextSmallStep,
  estimatedMinutes,
  available,
  stale,
  active,
  revision,
  continueFrom,
  lastAnchor,
  fingerprint,
  criteria,
  headings,
  connections,
  curriculumHref,
  demo = false,
  children,
}: {
  itemId: string;
  title: string;
  description?: string;
  marketExpectation: string[];
  nextSmallStep: string;
  estimatedMinutes?: number;
  available: boolean;
  stale: boolean;
  active: boolean;
  revision: number;
  continueFrom?: string;
  lastAnchor?: string;
  fingerprint: string;
  criteria: Criterion[];
  headings: Array<{ depth: number; slug: string; text: string }>;
  connections: ConnectionGroupData[];
  curriculumHref: string;
  demo?: boolean;
  children?: ReactNode;
}) {
  if (!available) {
    return <div className="content">
      <p className="eyebrow"><BookOpen size={13} strokeWidth={1.8} aria-hidden="true" /> {itemId}</p>
      <h1>{title}</h1>
      <EmptyAction
        title="Materi belum tersedia."
        description="Scope dan challenge tetap bisa dilihat dari kurikulum."
        href={curriculumHref}
        actionLabel="Kembali ke kurikulum"
      />
      <ConnectionsPanel groups={connections} compact />
    </div>;
  }

  return <div className="lesson-grid">
    <article className="prose">
      <p className="eyebrow"><BookOpen size={13} strokeWidth={1.8} aria-hidden="true" /> {itemId}</p>
      <h1>{title}</h1>
      {description && <p className="lede">{description}</p>}

      {demo && (
        <Alert title="Mode contoh" tone="info">
          Contoh tampilan. Materi ini tidak masuk kurikulum atau progres.
        </Alert>
      )}
      {stale && (
        <Alert title="Materi perlu diperbarui" tone="warning">
          <TriangleAlert size={14} strokeWidth={1.8} aria-hidden="true" /> Bukti sebelumnya tetap tersimpan.
        </Alert>
      )}
      {continueFrom && <Alert title="Lanjut dari">{continueFrom}</Alert>}

      {!demo && (
        <section className="lesson-execution-context">
          {marketExpectation.length > 0 && (
            <div className="lesson-why">
              <span className="eyebrow">KENAPA INI PENTING</span>
              <ul>{marketExpectation.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}

          <div className="lesson-small-step">
            <span className="eyebrow">MULAI KECIL</span>
            <strong>{nextSmallStep}</strong>
            {estimatedMinutes && <small>Estimasi materi: {Math.round(estimatedMinutes / 60 * 10) / 10} jam. Durasi bukan syarat selesai.</small>}
          </div>

          <div className="lesson-stuck">
            <Accordion
              defaultOpen={-1}
              items={[{
                title: 'Saya macet',
                content: <ol>
                  <li>Kerjakan hanya langkah ini: <strong>{nextSmallStep}</strong></li>
                  <li>Buat satu prediksi atau hipotesis sebelum mencoba.</li>
                  <li>Jalankan satu eksperimen kecil yang hasilnya bisa diamati.</li>
                  <li>Catat apa yang berbeda dari dugaanmu, lalu simpan titik lanjut.</li>
                </ol>,
              }]}
            />
          </div>
        </section>
      )}

      {!demo && !active && (
        <div className="actions">
          <ActivateItem itemId={itemId} label="Mulai belajar" />
        </div>
      )}

      {children}

      <ConnectionsPanel groups={connections} compact />

      {!demo && active && (
        <SessionLogger
          itemId={itemId}
          fingerprint={fingerprint}
          criteria={criteria}
          revision={revision}
          continueFrom={continueFrom}
          lastAnchor={lastAnchor}
        />
      )}
    </article>

    {headings.some((heading) => heading.depth === 2) && (
      <nav className="toc" aria-label="Di halaman ini">
        <span className="eyebrow"><ListTree size={12} strokeWidth={1.8} aria-hidden="true" /> DI HALAMAN INI</span>
        {headings
          .filter((heading) => heading.depth === 2)
          .map((heading) => <a key={heading.slug} href={'#' + heading.slug}>{heading.text}</a>)}
      </nav>
    )}
  </div>;
}
