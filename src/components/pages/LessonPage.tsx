"use client";

import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import { BookOpen, ExternalLink, ListTree, Target, TriangleAlert } from 'lucide-react';
import type { Criterion } from '../../domain/curriculum-v2/schema';
import { Alert } from '../arc/alert/alert';
import { Button } from '../arc/button/button';
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
  // SQL-001 is the first authored stage-based lesson. All other lessons retain
  // their existing MDX rendering and session workflow until explicitly migrated.
  const staged = itemId === 'SQL-001' && available && !demo;
  type LessonStageId = 'understand' | 'practice' | 'evidence';
  const stages: Array<{ id: LessonStageId; label: string }> = [
    { id: 'understand', label: 'Pahami' },
    { id: 'practice', label: 'Latihan' },
    { id: 'evidence', label: 'Bukti' },
  ];
  const [stage, setStage] = useState<LessonStageId>('understand');
  const [contextOpen, setContextOpen] = useState(false);

  useEffect(() => {
    if (!staged) return;
    const updateFromHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'understand' || hash === 'practice' || hash === 'evidence') {
        setStage(hash);
      } else if (hash === 'challenge') {
        // Keep pre-existing authored MDX anchors working after the stage split.
        setStage('practice');
      } else if (hash === 'exit-criteria') {
        setStage('evidence');
      } else if (hash === 'sumber') {
        setStage('understand');
      }
    };
    updateFromHash();
    window.addEventListener('hashchange', updateFromHash);
    return () => window.removeEventListener('hashchange', updateFromHash);
  }, [staged]);

  const chooseStage = (next: LessonStageId) => {
    setStage(next);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.hash = next;
      window.history.replaceState(window.history.state, '', url);
    }
  };

  const tabKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? stages.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + stages.length) % stages.length;
    chooseStage(stages[nextIndex].id);
    document.getElementById('lesson-tab-' + stages[nextIndex].id)?.focus();
  };

  const context = (
    <>
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
          <Accordion defaultOpen={-1} size="sm" items={[{
            title: 'Saya macet',
            content: <ol>
              <li>Kerjakan hanya: <strong>{nextSmallStep}</strong></li>
              <li>Buat satu prediksi sebelum mencoba.</li>
              <li>Jalankan satu eksperimen kecil.</li>
              <li>Kalau masih macet, simpan hambatannya saat mengakhiri sesi.</li>
            </ol>,
          }]} />
        </div>
      </section>
      <ConnectionsPanel groups={connections} compact />
    </>
  );


  return <div className={staged ? "lesson-grid lesson-sql001" : "lesson-grid"} data-active-stage={staged ? stage : undefined}>
    {!demo && !staged && (
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

      {staged && (
        <>
          <div className="lesson-stage-toolbar">
            <div className="lesson-stage-tabs" role="tablist" aria-label="Tahapan belajar SQL-001">
              {stages.map(({ id, label }, index) => (
                <Button
                  type="button"
                  key={id}
                  id={'lesson-tab-' + id}
                  role="tab"
                  aria-controls={'lesson-panel-' + id}
                  aria-selected={stage === id}
                  tabIndex={stage === id ? 0 : -1}
                  variant="ghost"
                  size="sm"
                  className="lesson-stage-tab"
                  onClick={() => chooseStage(id)}
                  onKeyDown={(event) => tabKeyboard(event, index)}
                >{label}</Button>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="lesson-context-toggle"
              aria-expanded={contextOpen}
              aria-controls="lesson-sql001-context"
              onClick={() => setContextOpen(!contextOpen)}
            >{contextOpen ? 'Tutup konteks' : 'Konteks materi'}</Button>
          </div>
          <aside id="lesson-sql001-context" className="lesson-sql001-context" aria-label="Konteks materi" hidden={!contextOpen}>{context}</aside>
        </>
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

      {!staged && <ConnectionsPanel groups={connections} compact />}

      {staged && stage === 'understand' && (
        <div className="lesson-stage-next"><Button type="button" variant="primary" onClick={() => chooseStage('practice')}>Mulai latihan</Button></div>
      )}
      {staged && stage === 'practice' && (
        <div className="lesson-stage-next"><Button type="button" variant="primary" onClick={() => chooseStage('evidence')}>Catat bukti</Button></div>
      )}

      {!demo && active && (
        <div className={staged ? 'lesson-sql001-evidence-form' : undefined}>
        <SessionLogger
          initialCompletionOpen={staged}
          itemId={itemId}
          fingerprint={fingerprint}
          criteria={criteria}
          revision={revision}
          continueFrom={continueFrom}
          lastAnchor={lastAnchor}
        />
        </div>
      )}
    </article>
  </div>;
}
