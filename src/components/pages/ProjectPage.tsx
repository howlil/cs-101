"use client";

import {
  ArrowLeft,
  ArrowRight,
  FolderKanban,
  Layers3,
  Link2,
  LockKeyhole,
} from 'lucide-react';
import type { Criterion } from '../../domain/curriculum-v2/schema';
import { Accordion } from '../arc/accordion/accordion';
import ItemStatusAction from '../learning/ItemStatusAction';
import type { ItemActionState } from '../../domain/learning/item-action';
import ProjectEvidence from '../course/ProjectEvidence';
import GuaranteeAccordion from '../project/GuaranteeAccordion';
import ConnectionsPanel, { type ConnectionGroupData } from '../curriculum/ConnectionsPanel';
import ActionLink from '../ui/ActionLink';

type NavItem = { id: string; title: string; href: string };

export default function ProjectPage({
  id,
  title,
  problemStatement,
  breadcrumb,
  curriculumHref,
  fingerprint,
  passed,
  active,
  ready,
  actionState,
  prerequisites,
  revision,
  continueFrom,
  lastAnchor,
  parent,
  next,
  contributors,
  newRequirements,
  inherited,
  inheritanceCriteria,
  inheritanceTitle,
  connections,
}: {
  id: string;
  title: string;
  problemStatement: string;
  breadcrumb: string;
  curriculumHref: string;
  fingerprint: string;
  passed: boolean;
  active: boolean;
  ready: boolean;
  actionState: ItemActionState;
  prerequisites: Array<{ id: string; title: string; href: string }>;
  revision: number;
  continueFrom?: string;
  lastAnchor?: string;
  parent?: NavItem;
  next?: NavItem;
  contributors: NavItem[];
  newRequirements: Criterion[];
  inherited: Criterion[];
  inheritanceCriteria: Criterion[];
  inheritanceTitle?: string;
  connections: ConnectionGroupData[];
}) {
  return <article className="project-workspace">
    <header className="project-header">
      <a className="project-back" href={curriculumHref}>
        <ArrowLeft size={14} strokeWidth={1.8} aria-hidden="true" />
        <span>Kurikulum</span>
      </a>
      <p className="project-breadcrumb">{breadcrumb}</p>
      <div className="project-kicker">
        <FolderKanban size={14} strokeWidth={1.8} aria-hidden="true" />
        <span>Project</span>
        <code>{id}</code>
      </div>
      <h1>{title}</h1>
      <p className="project-problem">{problemStatement}</p>

      <div className="project-status-row">
        <ItemStatusAction itemId={id} kind="checkpoint" state={actionState} prerequisites={prerequisites} />
      </div>
    </header>

    {passed && <div className="project-complete-next">
      <ActionLink href={next?.href ?? curriculumHref}
        label={next ? 'Buka project berikutnya' : 'Kembali ke kurikulum'} />
    </div>}

    <section className="project-reference" aria-label="Konteks project">
      <Accordion
        size="sm"
        defaultOpen={-1}
        items={[{
          title: 'Materi terkait & perjalanan project',
          content: <div className="project-reference-content">
            <aside className="project-sidecar" aria-label="Konteks project">
        <section className="project-context-strip">
          <div>
            <span>Melanjutkan dari</span>
            {parent ? <a href={parent.href}><code>{parent.id}</code> {parent.title}</a> : <strong>Project awal</strong>}
          </div>
          <div>
            <span>Materi terkait</span>
            <strong>{contributors.length}</strong>
          </div>
          <div>
            <span>Project berikutnya</span>
            {next ? <a href={next.href}><code>{next.id}</code> {next.title}</a> : <strong>Selesai</strong>}
          </div>
        </section>

        {contributors.length > 0 && (
          <section className="project-side-section">
            <div className="project-section-heading">
              <div>
                <p className="eyebrow">MATERI DASAR</p>
                <h2>Materi terkait</h2>
              </div>
              <span>{contributors.length}</span>
            </div>
            <div className="project-contributors">
              {contributors.map((item) => (
                <a href={item.href} key={item.id}>
                  <Link2 size={13} strokeWidth={1.8} aria-hidden="true" />
                  <code>{item.id}</code>
                  <span>{item.title}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        <ConnectionsPanel groups={connections} compact />

        <nav className="project-lineage-nav" aria-label="Navigasi project">
          {parent ? (
            <a href={parent.href}>
              <span><ArrowLeft size={13} strokeWidth={1.8} aria-hidden="true" /> Sebelumnya</span>
              <strong>{parent.id}</strong>
            </a>
          ) : <span />}
          {next ? (
            <a href={next.href}>
              <span>Berikutnya <ArrowRight size={13} strokeWidth={1.8} aria-hidden="true" /></span>
              <strong>{next.id}</strong>
            </a>
          ) : <span />}
        </nav>
      </aside>
          </div>,
        }]}
      />
    </section>

    <div className="project-body">


      <div className="project-main">
        <section className="project-section">
          <div className="project-section-heading">
            <div>
              <p className="eyebrow"><Layers3 size={13} strokeWidth={1.8} aria-hidden="true" /> YANG BARU</p>
              <h2>Yang harus dikerjakan di project ini</h2>
            </div>
            <span>{newRequirements.length}</span>
          </div>
          {newRequirements.length ? (
            <ol className="project-requirement-list">
              {newRequirements.map((criterion) => <li key={criterion.id}>{criterion.text}</li>)}
            </ol>
          ) : <p className="muted">Tidak ada tambahan baru dari project sebelumnya.</p>}
        </section>

        {parent && (
          <section className="project-section">
            <div className="project-section-heading">
              <div>
                <p className="eyebrow"><Link2 size={13} strokeWidth={1.8} aria-hidden="true" /> DARI PROJECT SEBELUMNYA</p>
                <h2>Yang harus tetap benar</h2>
              </div>
              <span>{inherited.length}</span>
            </div>
            <GuaranteeAccordion
              title={inheritanceTitle ?? 'Target dari project sebelumnya'}
              items={inherited.map((criterion) => criterion.text)}
            />
          </section>
        )}

        {active && !passed ? (
          <ProjectEvidence
            itemId={id}
            fingerprint={fingerprint}
            newRequirements={newRequirements}
            inheritanceCriteria={inheritanceCriteria}
            inheritedGuarantees={inherited}
            revision={revision}
            continueFrom={continueFrom}
            lastAnchor={lastAnchor}
          />
        ) : !passed && (
          <section className="project-section project-evidence-placeholder">
            <p className="eyebrow"><LockKeyhole size={13} strokeWidth={1.8} aria-hidden="true" /> BUKTI</p>
            <h2>{ready ? 'Mulai project untuk mencatat bukti.' : 'Bukti belum dapat dicatat.'}</h2>
            {!ready && <p className="muted">Selesaikan prasyarat terlebih dahulu.</p>}
          </section>
        )}
      </div>
    </div>
  </article>;
}
