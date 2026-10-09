"use client";

import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import { BookOpen, ExternalLink, ListTree, Target, TriangleAlert, ArrowLeft, ArrowRight } from 'lucide-react';
import type { ItemActionState } from '../../domain/learning/item-action';
import type { StagedLessonHeading } from '../../domain/learning/lesson-headings';
import ItemStatusAction from '../learning/ItemStatusAction';
import type { Criterion } from '../../domain/curriculum-v2/schema';
import { Alert } from '../arc/alert/alert';
import { Button } from '../arc/button/button';
import { Accordion } from '../arc/accordion/accordion';
import SessionLogger from '../learning/SessionLogger';
import ConnectionsPanel, { type ConnectionGroupData } from '../curriculum/ConnectionsPanel';

type StageId = 'understand' | 'practice' | 'evidence';
const stages: Array<{ id: StageId; label: string }> = [
  { id: 'understand', label: 'Pahami' },
  { id: 'practice', label: 'Latihan' },
  { id: 'evidence', label: 'Bukti' },
];

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
  actionState,
  prerequisites = [],
  breadcrumb,
  previous,
  next,
  reviewHref,
  curriculumHref,
  revision,
  continueFrom,
  lastAnchor,
  fingerprint,
  criteria,
  headings,
  connections,
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
  actionState?: ItemActionState;
  prerequisites?: Array<{ id: string; title: string; href: string }>;
  breadcrumb?: { track: string; module: string; position: number; total: number };
  previous?: { id: string; title: string; href: string };
  next?: { id: string; title: string; href: string };
  reviewHref?: string;
  revision: number;
  continueFrom?: string;
  lastAnchor?: string;
  fingerprint: string;
  criteria: Criterion[];
  headings: StagedLessonHeading[];
  connections: ConnectionGroupData[];
  curriculumHref: string;
  children?: ReactNode;
}) {
  const toc = headings.filter((heading) => heading.depth === 2);
  const visibleState: ItemActionState = actionState ?? {
    status: active ? 'active' : 'unknown',
    isFocused: active,
    canActivate: false,
    missingPrerequisites: [],
  };
  // All curriculum units expose the same stages. Authored MDX defines its own
  // boundaries; missing lessons use structured manifest content, not fake MDX.
  const [stage, setStage] = useState<StageId>('understand');
  const [contextOpen, setContextOpen] = useState(false);
  const [focus, setFocus] = useState(false);

  useEffect(() => {
    const updateFromHash = () => {
      const hash = window.location.hash.slice(1);
      const mapped = toc.find((heading) => heading.slug === hash);
      const next: StageId = mapped?.stage
        ?? (hash === 'practice' || hash === 'challenge' ? 'practice'
          : hash === 'evidence' || hash === 'exit-criteria' ? 'evidence' : 'understand');
      setStage(next);
    };
    updateFromHash();
    window.addEventListener('hashchange', updateFromHash);
    return () => window.removeEventListener('hashchange', updateFromHash);
  }, [itemId, headings]);

  useEffect(() => {
    document.documentElement.dataset.focus = focus ? 'true' : 'false';
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && focus) setFocus(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      delete document.documentElement.dataset.focus;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [focus]);

  const chooseStage = (next: StageId, focusPanel = false) => {
    setStage(next);
    const url = new URL(window.location.href);
    url.hash = next;
    window.history.replaceState(window.history.state, '', url);
    // The bottom-of-lesson CTA switches content far above the current
    // viewport. Move focus to the newly visible panel, not to a dead spot.
    if (focusPanel) {
      window.requestAnimationFrame(() => {
        document.getElementById('lesson-panel-' + next)?.focus();
      });
    }
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const selected = event.key === 'Home' ? 0 : event.key === 'End' ? stages.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + stages.length) % stages.length;
    chooseStage(stages[selected].id);
    document.getElementById('lesson-tab-' + stages[selected].id)?.focus();
  };

  const context = (
    <>
      <section className="lesson-execution-context">
        {marketExpectation.length > 0 && <div className="lesson-why">
          <span className="eyebrow">KENAPA MATERI INI ADA</span>
          <ul>{marketExpectation.slice(0, 2).map((item) => <li key={item}>{item}</li>)}</ul>
        </div>}
        <div className="lesson-small-step">
          <span className="eyebrow">BERIKUTNYA</span>
          <strong>{nextSmallStep}</strong>
        </div>
        <Accordion defaultOpen={-1} size="sm" items={[{
          title: 'Saya macet',
          content: <ol>
            <li>Kerjakan satu langkah: <strong>{nextSmallStep}</strong></li>
            <li>Prediksi dulu, jalankan satu eksperimen, lalu simpan hasilnya.</li>
            <li>Catat hambatan saat mengakhiri sesi.</li>
          </ol>,
        }]} />
      </section>
      {toc.length > 0 && <nav className="lesson-context-toc" aria-label="Di halaman ini">
        <span className="eyebrow"><ListTree size={13} aria-hidden="true" /> DI HALAMAN INI</span>
        {toc.map((heading) => <a key={heading.slug} href={'#' + heading.slug}
          onClick={() => setStage(heading.stage)}
        >{heading.text}</a>)}
      </nav>}
      <ConnectionsPanel groups={connections} compact />
    </>
  );

  return <div className="lesson-grid lesson-staged" data-active-stage={stage}>
    <article className="prose">
      <nav className="lesson-location" aria-label="Posisi di kurikulum">
        <a href={curriculumHref}>Kurikulum</a>
        {breadcrumb?.track && <span>{breadcrumb.track}</span>}
        {breadcrumb?.module && <span>{breadcrumb.module}</span>}
        {breadcrumb?.total ? <span>Materi {breadcrumb.position} dari {breadcrumb.total}</span> : null}
      </nav>
      <p className="eyebrow"><BookOpen size={13} strokeWidth={1.8} aria-hidden="true" /> {itemId}</p>
      <h1>{title}</h1>
      {stale && <Alert title="Perlu diperbarui" tone="warning">
        <TriangleAlert size={14} strokeWidth={1.8} aria-hidden="true" /> Bukti lama tetap tersimpan.
      </Alert>}
      {continueFrom && <Alert title="Lanjut dari">{continueFrom}</Alert>}
      {!available && <Alert title="Kerangka kurikulum — materi belum ditulis" tone="info">
        Halaman ini berisi cakupan, latihan manual, dan target dari kurikulum. Penjelasan, contoh, dan kuis authored untuk {itemId} belum tersedia; tidak ada penilaian latihan otomatis.
      </Alert>}
      {actionState && <ItemStatusAction
        itemId={itemId}
        kind="unit"
        state={visibleState}
        prerequisites={prerequisites}
      />}
      {reviewHref && <p className="lesson-review-link"><a href={reviewHref}>Lihat status dan jadwal review</a></p>}

      <div className="lesson-stage-toolbar">
          <div className="lesson-stage-tabs" role="tablist" aria-label="Tahapan belajar">
            {stages.map(({ id, label }, index) => <Button
              key={id} id={'lesson-tab-' + id} type="button"
              role="tab" aria-controls={'lesson-panel-' + id} aria-selected={stage === id}
              tabIndex={stage === id ? 0 : -1} variant="ghost" size="sm"
              className="lesson-stage-tab"
              onClick={() => chooseStage(id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
            >{label}</Button>)}
          </div>
          <div className="lesson-toolbar-actions">
            <Button type="button" variant="ghost" size="sm"
              className="lesson-context-toggle" aria-expanded={contextOpen}
              aria-controls="lesson-context" onClick={() => setContextOpen((open) => !open)}
            >{contextOpen ? 'Tutup konteks' : 'Konteks'}</Button>
            <Button type="button" variant="ghost" size="sm"
              className="lesson-focus-toggle" aria-pressed={focus}
              onClick={() => setFocus((current) => !current)}
            >{focus ? 'Keluar fokus' : 'Mode fokus'}</Button>
          </div>
        </div>
      <aside id="lesson-context" className="lesson-staged-context" aria-label="Konteks materi" hidden={!contextOpen}>{context}</aside>

      {available ? children : <>
        <section className="lesson-stage-panel" data-lesson-stage="understand"
          id="lesson-panel-understand" role="tabpanel" aria-labelledby="lesson-tab-understand" tabIndex={0}>
          <h2>Yang perlu dikuasai</h2>
          <ul>{scope.map((item) => <li key={item}>{item}</li>)}</ul>
          <h2>Referensi utama</h2>
          {source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" /> {source.title}
          </a> : <p>{source.title}</p>}
        </section>
        <section className="lesson-stage-panel" data-lesson-stage="practice"
          id="lesson-panel-practice" role="tabpanel" aria-labelledby="lesson-tab-practice" tabIndex={0}>
          <h2><Target size={17} strokeWidth={1.8} aria-hidden="true" /> {challenge.title}</h2>
          <ol>{challenge.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        </section>
        <section className="lesson-stage-panel" data-lesson-stage="evidence"
          id="lesson-panel-evidence" role="tabpanel" aria-labelledby="lesson-tab-evidence" tabIndex={0}>
          <h2>Selesai jika</h2>
          <ol>{criteria.map((criterion) => <li key={criterion.id}>{criterion.text}</li>)}</ol>
        </section>
      </>}


      {stage === 'understand' && <div className="lesson-stage-next">
        <Button type="button" variant="primary" onClick={() => chooseStage('practice', true)}>Mulai latihan</Button>
      </div>}
      {stage === 'practice' && <div className="lesson-stage-next">
        <Button type="button" variant="primary" onClick={() => chooseStage('evidence', true)}>Catat bukti</Button>
      </div>}
      {stage === 'evidence' && (!active || visibleState.status === 'passed') && (
        <aside className="lesson-evidence-gate" aria-label="Status penyimpanan bukti">
          {visibleState.status === 'passed' ? <>
            <strong>Materi sudah selesai.</strong>
            <p>Bukti sebelumnya tetap tersimpan. Review dijadwalkan terpisah dari latihan ini.</p>
            {reviewHref && <a href={reviewHref}>Lihat status review</a>}
          </> : <>
            <strong>{visibleState.status === 'locked'
              ? 'Prasyarat belum terpenuhi'
              : 'Aktifkan materi untuk menyimpan bukti'}</strong>
            <p>{visibleState.status === 'locked'
              ? 'Kamu boleh membaca dan berlatih sekarang. Penyimpanan sesi tersedia setelah prasyarat diselesaikan.'
              : 'Kamu boleh membaca dan mencoba latihan tanpa mengaktifkan materi. Untuk menyimpan sesi dan bukti selesai, aktifkan materi terlebih dahulu.'}</p>
            <ItemStatusAction itemId={itemId} kind="unit" state={visibleState} prerequisites={prerequisites} />
          </>}
        </aside>
      )}
      {active && visibleState.status !== 'passed' && <div className="lesson-staged-evidence-form"
        role="group"
        aria-labelledby="lesson-tab-evidence">
        <SessionLogger
          initialCompletionOpen
          itemId={itemId}
          fingerprint={fingerprint}
          criteria={criteria}
          revision={revision}
          continueFrom={continueFrom}
          lastAnchor={lastAnchor}
        />
      </div>}
      {(previous || next) && <nav className="lesson-sequence" aria-label="Navigasi materi">
        {previous ? <a href={previous.href} rel="prev">
          <ArrowLeft size={15} aria-hidden="true" />
          <span><small>Sebelumnya · {previous.id}</small><strong>{previous.title}</strong></span>
        </a> : <span />}
        {next ? <a href={next.href} rel="next">
          <span><small>Berikutnya · {next.id}</small><strong>{next.title}</strong></span>
          <ArrowRight size={15} aria-hidden="true" />
        </a> : <span />}
      </nav>}
    </article>
  </div>;
}
