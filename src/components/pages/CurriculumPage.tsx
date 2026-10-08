"use client";

import {
  Boxes, CheckCircle2, Clock3, ExternalLink, FolderKanban,
  Link2, LockKeyhole, Target, TriangleAlert,
} from 'lucide-react';
import ActivateItem from '../learning/ActivateItem';
import ActionLink from '../ui/ActionLink';
import { Badge } from '../arc/badge/badge';

type Criterion = { id: string; text: string };
type SelectedItem = {
  id: string;
  kind: 'unit' | 'checkpoint' | 'integration';
  title: string;
  breadcrumb: string;
  href: string;
  state?: 'passed' | 'stale' | 'active' | 'started' | 'locked' | 'ready' | 'unknown';
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

export default function CurriculumPage({ selected }: { selected?: SelectedItem }) {
  return <section className="curriculum-workspace" aria-label="Detail kurikulum">
      <div className="curriculum-detail">
        {selected ? <>
          <header className="item-header">
            <p className="breadcrumb">{selected.breadcrumb}</p>
            <code className="item-id-standalone">{selected.id}</code>
            <h2>{selected.title}</h2>
          </header>

          <div className="item-workbench">
            <aside className="item-context" aria-label="Konteks item">
              {selected.state && <div className="item-state-actions">
                {selected.state === 'passed' ? (
                  <>
                    <Badge tone="success" icon={<CheckCircle2 size={14} strokeWidth={1.8} />}>Selesai</Badge>
                    <ActionLink href={selected.href} label="Buka materi" />
                  </>
                ) : selected.state === 'stale' ? (
                  <>
                    <Badge tone="warning" icon={<TriangleAlert size={14} strokeWidth={1.8} />}>Perlu diperbarui</Badge>
                    <ActionLink href={selected.href} label="Buka & validasi" />
                  </>
                ) : selected.state === 'active' ? (
                  <ActionLink href={selected.href} label="Lanjut belajar" />
                ) : selected.state === 'ready' || selected.state === 'started' ? (
                  <ActivateItem
                    itemId={selected.id}
                    label={selected.state === 'started'
                      ? 'Lanjut'
                      : selected.kind === 'unit'
                        ? 'Mulai belajar'
                        : selected.kind === 'checkpoint'
                          ? 'Mulai project'
                          : 'Mulai latihan gabungan'}
                  />
                ) : selected.state === 'locked' ? (
                  <Badge tone="neutral" icon={<LockKeyhole size={14} strokeWidth={1.8} />}>
                    Terkunci · {selected.missingPrerequisites.join(', ')}
                  </Badge>
                ) : null}
              </div>}

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
            </aside>

            <main className="item-main">
              {selected.marketExpectation?.length ? (
                <section className="item-section item-why">
                  <h3>Kenapa materi ini ada</h3>
                  <ul className="compact-list">{selected.marketExpectation.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
              ) : null}

              {selected.nextSmallStep && (
                <section className="item-section item-next-step">
                  <span className="explorer-label">BERIKUTNYA</span>
                  <strong>{selected.nextSmallStep}</strong>
                </section>
              )}

              {selected.kind === 'unit' && <>
                <section className="item-section">
                  <h3>Yang perlu dikuasai</h3>
                  <ul className="compact-list">{selected.scope?.map((scope) => <li key={scope}>{scope}</li>)}</ul>
                </section>
                <section className="item-section challenge-preview">
                  <div className="compact-section-heading">
                    <h3><Target size={15} strokeWidth={1.8} aria-hidden="true" /> {selected.challenge?.title ?? 'Latihan'}</h3>
                    <span>Latihan</span>
                  </div>
                  <ul className="compact-list">{selected.challenge?.steps.map((step) => <li key={step}>{step}</li>)}</ul>
                </section>
                <section className="item-section">
                  <h3><CheckCircle2 size={15} strokeWidth={1.8} aria-hidden="true" /> Selesai jika</h3>
                  <ol className="criteria-list">{selected.criteria?.map((criterion) => <li key={criterion.id}>{criterion.text}</li>)}</ol>
                </section>
              </>}

              {selected.kind === 'checkpoint' && (
                <section className="item-section">
                  <h3><FolderKanban size={15} strokeWidth={1.8} aria-hidden="true" /> Project</h3>
                  <p>{selected.problemStatement}</p>
                  <ActionLink href={selected.href} label="Buka project" />
                </section>
              )}

              {selected.kind === 'integration' && (
                <section className="item-section">
                  <h3><Boxes size={15} strokeWidth={1.8} aria-hidden="true" /> Latihan gabungan</h3>
                  <p>{selected.brief}</p>
                  <ActionLink href={selected.href} label="Buka latihan" />
                </section>
              )}
            </main>
          </div>
        </> : (
          <div className="curriculum-empty">
            <h2>Kurikulum belum tersedia.</h2>
          </div>
        )}
      </div>
    </section>;
}
