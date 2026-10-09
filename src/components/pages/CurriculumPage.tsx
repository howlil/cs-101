"use client";

import {
  ArrowRight, Boxes, Clock3, ExternalLink, FolderKanban, Link2,
} from 'lucide-react';
import ItemStatusAction from '../learning/ItemStatusAction';
import type { ItemActionState } from '../../domain/learning/item-action';
import { Accordion } from '../arc/accordion/accordion';

type Criterion = { id: string; text: string };
type SelectedItem = {
  id: string;
  kind: 'unit' | 'checkpoint' | 'integration';
  title: string;
  hasLesson?: boolean;
  breadcrumb: string;
  href: string;
  state?: 'passed' | 'stale' | 'active' | 'started' | 'locked' | 'ready' | 'unknown';
  actionState?: ItemActionState;
  missingPrerequisites: string[];
  marketExpectation?: string[];
  nextSmallStep?: string;
  scope?: string[];
  challenge?: { title: string; steps: string[] };
  criteria?: Criterion[];
  problemStatement?: string;
  brief?: string;
  source: { title: string; url?: string };
  estimatedHours?: number;
  prerequisites: Array<{ id: string; title: string; href: string }>;
};

type TrackOverview = {
  id: string;
  title: string;
  completed: number;
  total: number;
  modules: Array<{ id: string; title: string; completed: number; total: number; href: string; firstItemTitle: string }>; 
};

export default function CurriculumPage({ selected, overview }: { selected?: SelectedItem; overview?: TrackOverview }) {
  return <section className="curriculum-workspace" aria-label="Detail kurikulum">
      <div className="curriculum-detail">
        {selected ? <>
          <header className="item-header">
            <p className="breadcrumb">{selected.breadcrumb}</p>
            <code className="item-id-standalone">{selected.id}</code>
            <h2>{selected.title}</h2>
            {selected.kind === 'unit' && !selected.hasLesson && (
              <p className="item-outline-status">Kerangka materi · penjelasan dan kuis lengkap belum tersedia. Latihan dilakukan secara mandiri.</p>
            )}
          </header>


          {selected.actionState && <div className="item-state-actions">
            <ItemStatusAction
              itemId={selected.id}
              kind={selected.kind}
              href={selected.href}
              mode="preview"
              state={selected.actionState}
              prerequisites={selected.prerequisites}
            />
          </div>}
          <div className="item-workbench">
            <div className="item-main">
              {selected.nextSmallStep && (
                <section className="item-section item-next-step">
                  <span className="explorer-label">BERIKUTNYA</span>
                  <strong>{selected.nextSmallStep}</strong>
                </section>
              )}

              {selected.kind === 'unit' && <section className="item-section">
                <h3>Yang akan dipelajari</h3>
                <ul className="compact-list">{selected.scope?.slice(0, 3).map((scope) => <li key={scope}>{scope}</li>)}</ul>
                {(selected.scope?.length ?? 0) > 3 && <p className="item-brief-note">
                  +{selected.scope!.length - 3} kompetensi lain dijelaskan di materi.
                </p>}
              </section>}

              {selected.kind === 'checkpoint' && (
                <section className="item-section">
                  <h3><FolderKanban size={15} strokeWidth={1.8} aria-hidden="true" /> Project</h3>
                  <p>{selected.problemStatement}</p>
                </section>
              )}

              {selected.kind === 'integration' && (
                <section className="item-section">
                  <h3><Boxes size={15} strokeWidth={1.8} aria-hidden="true" /> Latihan gabungan</h3>
                  <p>{selected.brief}</p>
                </section>
              )}

            </div>
            <section className="item-details-disclosure" aria-label="Konteks kurikulum">
              <Accordion size="sm" defaultOpen={-1} items={[{
                title: 'Detail tambahan · prasyarat, manfaat & sumber',
                content: <aside className="item-context" aria-label="Prasyarat dan referensi">
              {selected.marketExpectation?.length ? (
                <section className="item-context-section">
                  <h3>Kenapa materi ini penting</h3>
                  <ul className="compact-list">{selected.marketExpectation.map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
              ) : null}

              {selected.prerequisites.length > 0 && (
                <section className="item-context-section">
                  <h3><Link2 size={14} strokeWidth={1.8} aria-hidden="true" /> Prasyarat</h3>
                  <div className="connection-list">
                    {selected.prerequisites.map((item) => (
                      <a href={item.href} key={item.id}>
                        <code>{item.id}</code>
                        <span>{item.title}</span>
                      </a>
                    ))}
                  </div>
                </section>
              )}

              <section className="item-context-section item-meta">
                <div>
                  <span className="explorer-label"><ExternalLink size={11} strokeWidth={1.8} aria-hidden="true" /> SUMBER</span>
                  {selected.source.url
                    ? <a href={selected.source.url} target="_blank" rel="noopener noreferrer">{selected.source.title}</a>
                    : <span>{selected.source.title}</span>}
                </div>
                {selected.estimatedHours && (
                  <div>
                    <span className="explorer-label"><Clock3 size={11} strokeWidth={1.8} aria-hidden="true" /> ESTIMASI</span>
                    <span>{selected.estimatedHours}h</span>
                  </div>
                )}
              </section>

                </aside>,
              }]} />
            </section>
          </div>
        </> : overview ? (
          <div className="curriculum-overview">
            <header className="item-header">
              <p className="breadcrumb">Kurikulum / Jalur</p>
              <h2>{overview.title}</h2>
              <p className="curriculum-overview-summary">
                {overview.completed} dari {overview.total} materi dan project selesai. Pilih modul untuk melihat materi pertamanya.
              </p>
            </header>
            <nav className="curriculum-overview-modules" aria-label="Modul di jalur">
              {overview.modules.map((module, index) => (
                <a href={module.href} key={module.id}>
                  <span className="curriculum-overview-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="curriculum-overview-copy">
                    <strong>{module.title}</strong>
                    <small>{module.completed}/{module.total} selesai</small>
                    <span className="curriculum-module-first">Materi pertama: {module.firstItemTitle}</span>
                  </span>
                  <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
                </a>
              ))}
            </nav>
          </div>
        ) : (
          <div className="curriculum-empty"><h2>Kurikulum belum tersedia.</h2></div>
        )}
      </div>
    </section>;
}
