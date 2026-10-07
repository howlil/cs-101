"use client";

import {
  Boxes,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FolderKanban,
  Link2,
  ListTree,
  LockKeyhole,
  Target,
  TriangleAlert,
} from 'lucide-react';
import CurriculumExplorer, { type ExplorerItem } from '../curriculum/CurriculumExplorer';
import ActivateItem from '../learning/ActivateItem';
import ActionLink from '../ui/ActionLink';
import { Badge } from '../arc/badge/badge';
import { Card } from '../arc/card/card';

type Criterion = { id: string; text: string };
type SelectedItem = {
  id: string;
  kind: 'unit' | 'checkpoint' | 'integration';
  title: string;
  breadcrumb: string;
  href: string;
  state?: ExplorerItem['state'];
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

export default function CurriculumPage({
  total,
  activeTrackId,
  selectedModuleId,
  tracks,
  modules,
  integrations,
  searchEntries,
  selected,
}: {
  total: number;
  activeTrackId: string;
  selectedModuleId?: string;
  tracks: Array<{ id: string; title: string; total: number }>;
  modules: Array<{ id: string; title: string; items: ExplorerItem[] }>;
  integrations: ExplorerItem[];
  searchEntries: Array<ExplorerItem & { searchText: string }>;
  selected?: SelectedItem;
}) {
  return <div className="curriculum-shell">
    <aside className="curriculum-explorer" aria-label="Penjelajah kurikulum">
      <div className="explorer-heading">
        <div>
          <p className="eyebrow"><ListTree size={13} strokeWidth={1.8} aria-hidden="true" /> KURIKULUM</p>
          <h1>Materi</h1>
        </div>
        <span className="explorer-count">{total}</span>
      </div>

      <CurriculumExplorer
        activeTrackId={activeTrackId}
        selectedModuleId={selectedModuleId}
        tracks={tracks}
        modules={modules}
        integrations={integrations}
        searchEntries={searchEntries}
      />
    </aside>

    <section className="curriculum-workspace">
      {selected ? <>
        <header className="item-header">
          <p className="breadcrumb">{selected.breadcrumb}</p>
          <div className="item-kicker">
            <span>{selected.kind === 'checkpoint' ? 'Project checkpoint' : selected.kind === 'integration' ? 'Integrasi' : 'Unit'}</span>
            <code>{selected.id}</code>
          </div>
          <h2>{selected.title}</h2>

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
                label={selected.state === 'started' ? 'Lanjut belajar' : selected.kind === 'unit' ? 'Mulai belajar' : 'Mulai item'}
              />
            ) : selected.state === 'locked' ? (
              <Badge tone="neutral" icon={<LockKeyhole size={14} strokeWidth={1.8} />}>
                Terkunci · selesaikan {selected.missingPrerequisites.join(', ')}
              </Badge>
            ) : null}
          </div>}
        </header>

        {selected.marketExpectation?.length ? (
          <section className="item-section item-why">
            <h3>Kenapa ini penting</h3>
            <ul className="compact-list">{selected.marketExpectation.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        ) : null}

        {selected.nextSmallStep && (
          <section className="item-section item-next-step">
            <span className="explorer-label">MULAI KECIL</span>
            <strong>{selected.nextSmallStep}</strong>
            <p className="muted small">Kalau macet, kerjakan langkah ini saja sebelum membuka scope lain.</p>
          </section>
        )}

        {selected.prerequisites.length > 0 && (
          <section className="item-section">
            <h3><Link2 size={16} strokeWidth={1.8} aria-hidden="true" /> Prasyarat</h3>
            <div className="connection-list">
              {selected.prerequisites.map((item) => (
                <a href={item.href} key={item.id}>
                  <Link2 size={13} strokeWidth={1.8} aria-hidden="true" />
                  <code>{item.id}</code>
                  <span>{item.title}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {selected.kind === 'unit' && <>
          <section className="item-section">
            <h3><ListTree size={16} strokeWidth={1.8} aria-hidden="true" /> Yang dipelajari</h3>
            <ul className="compact-list">{selected.scope?.map((scope) => <li key={scope}>{scope}</li>)}</ul>
          </section>
          <div className="item-section challenge-preview">
            <Card
              title={selected.challenge?.title ?? 'Mini challenge'}
              status="Challenge"
              meta={<Target size={14} strokeWidth={1.8} aria-hidden="true" />}
            >
              <ul className="compact-list">{selected.challenge?.steps.map((step) => <li key={step}>{step}</li>)}</ul>
            </Card>
          </div>
          <section className="item-section">
            <h3><CheckCircle2 size={16} strokeWidth={1.8} aria-hidden="true" /> Target selesai</h3>
            <ol className="criteria-list">{selected.criteria?.map((criterion) => <li key={criterion.id}>{criterion.text}</li>)}</ol>
          </section>
        </>}

        {selected.kind === 'checkpoint' && (
          <section className="item-section">
            <h3><FolderKanban size={16} strokeWidth={1.8} aria-hidden="true" /> Project checkpoint</h3>
            <p>{selected.problemStatement}</p>
            <p><ActionLink href={selected.href} label="Buka project workspace" /></p>
          </section>
        )}

        {selected.kind === 'integration' && (
          <section className="item-section">
            <h3><Boxes size={16} strokeWidth={1.8} aria-hidden="true" /> Integrasi lintas jalur</h3>
            <p>{selected.brief}</p>
            <p><ActionLink href={selected.href} label="Buka integration workspace" /></p>
          </section>
        )}

        <section className="item-section item-meta">
          <div>
            <span className="explorer-label"><ExternalLink size={12} strokeWidth={1.8} aria-hidden="true" /> SUMBER</span>
            {selected.source.url
              ? <a href={selected.source.url} target="_blank" rel="noopener noreferrer">
                  {selected.source.title} <ExternalLink size={12} strokeWidth={1.8} aria-hidden="true" />
                </a>
              : <span>{selected.source.title}</span>}
          </div>
          {selected.estimatedHours && (
            <div>
              <span className="explorer-label"><Clock3 size={12} strokeWidth={1.8} aria-hidden="true" /> ESTIMASI</span>
              <span>{selected.estimatedHours}h</span>
            </div>
          )}
        </section>
      </> : (
        <div className="curriculum-empty">
          <h2>Kurikulum belum tersedia.</h2>
          <p>Tidak ada item yang dapat ditampilkan.</p>
        </div>
      )}
    </section>
  </div>;
}
