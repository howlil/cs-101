"use client";

import type { ReactNode } from 'react';
import { BookOpen, ExternalLink, ListTree, Target, TriangleAlert } from 'lucide-react';
import type { Criterion } from '../../domain/curriculum-v2/schema';
import { Alert } from '../arc/alert/alert';
import { Accordion } from '../arc/accordion/accordion';
import ActivateItem from '../learning/ActivateItem';
import SessionLogger from '../course/SessionLogger';
import ConnectionsPanel, { type ConnectionGroupData } from '../curriculum/ConnectionsPanel';

export default function LessonPage({
  itemId,
  title,
  marketExpectation,
  nextSmallStep,
  scope,
  challenge,
  source,
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
  demo = false,
  children,
}: {
  itemId: string;
  title: string;
  description?: string;
  marketExpectation: string[];
  nextSmallStep: string;
  estimatedMinutes?: number;
  scope: string[];
  challenge: { title: string; steps: string[] };
  source: { title: string; url?: string };
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
  const toc = headings.filter((heading) => heading.depth === 2);

  return <div className="lesson-grid">
    {!demo && (
      <aside className="lesson-sidecar" aria-label="Konteks belajar">
        <section className="lesson-execution-context">
          {marketExpectation.length > 0 && (
            <div className="lesson-why">
              <span className="eyebrow">KENAPA MATERI INI ADA</span>
              <ul>{marketExpectation.slice(0, 2).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}

          <div className="lesson-small-step">
            <span className="eyebrow">BERIKUTNYA</span>
            <strong>{nextSmallStep}</strong>
          </div>

          <div className="lesson-stuck">
            <Accordion
              defaultOpen={-1}
              size="sm"
              items={[{
                title: 'Saya macet',
                content: <ol>
                  <li>Kerjakan hanya: <strong>{nextSmallStep}</strong></li>
                  <li>Buat satu prediksi sebelum mencoba.</li>
                  <li>Jalankan satu eksperimen kecil.</li>
                  <li>Kalau masih macet, simpan hambatannya saat mengakhiri sesi.</li>
                </ol>,
              }]}
            />
          </div>
        </section>

        {toc.length > 0 && (
          <nav className="toc" aria-label="Di halaman ini">
            <span className="eyebrow"><ListTree size={12} strokeWidth={1.8} aria-hidden="true" /> DI HALAMAN INI</span>
            {toc.map((heading) => <a key={heading.slug} href={'#' + heading.slug}>{heading.text}</a>)}
          </nav>
        )}
      </aside>
    )}

    <article className="prose">
      <p className="eyebrow"><BookOpen size={13} strokeWidth={1.8} aria-hidden="true" /> {itemId}</p>
      <h1>{title}</h1>

      {demo && <Alert title="Mode contoh" tone="info">Tidak masuk progres.</Alert>}
      {stale && (
        <Alert title="Perlu diperbarui" tone="warning">
          <TriangleAlert size={14} strokeWidth={1.8} aria-hidden="true" /> Bukti lama tetap tersimpan.
        </Alert>
      )}
      {continueFrom && <Alert title="Lanjut dari">{continueFrom}</Alert>}

      {!available && !demo && (
        <Alert title="Materi lengkap belum tersedia" tone="info">
          Ringkasan kurikulum di bawah tetap bisa dipakai untuk belajar. Kelulusan ditentukan oleh latihan, target selesai, dan bukti — bukan keberadaan halaman materi lengkap.
        </Alert>
      )}

      {!demo && !active && (
        <div className="actions">
          <ActivateItem itemId={itemId} label="Mulai belajar" />
        </div>
      )}

      {available ? children : (
        <div className="lesson-fallback">
          <section>
            <h2>Yang perlu dikuasai</h2>
            <ul>{scope.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>

          <section>
            <h2><Target size={16} strokeWidth={1.8} aria-hidden="true" /> Latihan</h2>
            <h3>{challenge.title}</h3>
            <ol>{challenge.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          </section>

          <section>
            <h2>Selesai jika</h2>
            <ol>{criteria.map((criterion) => <li key={criterion.id}>{criterion.text}</li>)}</ol>
          </section>

          <section>
            <h2>Sumber utama</h2>
            {source.url ? (
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" /> {source.title}
              </a>
            ) : <p>{source.title}</p>}
          </section>
        </div>
      )}

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
  </div>;
}
