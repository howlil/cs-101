"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FolderKanban,
  Layers3,
  Link2,
  LockKeyhole,
  TriangleAlert,
} from 'lucide-react';
import type { Criterion } from '../../domain/curriculum-v2/schema';
import { Badge } from '../arc/badge/badge';
import ActivateItem from '../learning/ActivateItem';
import ProjectEvidence from '../course/ProjectEvidence';
import GuaranteeAccordion from '../project/GuaranteeAccordion';
import ConnectionsPanel, { type ConnectionGroupData } from '../curriculum/ConnectionsPanel';

type NavItem = { id: string; title: string; href: string };

export default function ProjectPage({
  id,
  title,
  problemStatement,
  breadcrumb,
  curriculumHref,
  fingerprint,
  passed,
  stale,
  active,
  ready,
  missingPrerequisites,
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
  stale: boolean;
  active: boolean;
  ready: boolean;
  missingPrerequisites: string[];
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
        <span>Checkpoint</span>
        <code>{id}</code>
      </div>
      <h1>{title}</h1>
      <p className="project-problem">{problemStatement}</p>

      <div className="project-status-row">
        {passed ? (
          <Badge tone="success" icon={<CheckCircle2 size={14} strokeWidth={1.8} />}>Selesai</Badge>
        ) : stale && !active ? (
          <>
            <Badge tone="warning" icon={<TriangleAlert size={14} strokeWidth={1.8} />}>Perlu diperbarui</Badge>
            {ready && <ActivateItem itemId={id} label="Perbarui & validasi" />}
          </>
        ) : active ? (
          <Badge tone="info" icon={<FolderKanban size={14} strokeWidth={1.8} />}>Sedang dikerjakan</Badge>
        ) : ready ? (
          <ActivateItem itemId={id} label="Mulai checkpoint" />
        ) : (
          <Badge tone="neutral" icon={<LockKeyhole size={14} strokeWidth={1.8} />}>
            Terkunci · selesaikan {missingPrerequisites.join(', ') || 'prasyarat'}
          </Badge>
        )}
      </div>
    </header>

    <div className="project-body">
      <aside className="project-sidecar" aria-label="Konteks checkpoint">
        <section className="project-context-strip">
          <div>
            <span>Built on</span>
            {parent ? <a href={parent.href}><code>{parent.id}</code> {parent.title}</a> : <strong>Root</strong>}
          </div>
          <div>
            <span>Units</span>
            <strong>{contributors.length}</strong>
          </div>
          <div>
            <span>Next</span>
            {next ? <a href={next.href}><code>{next.id}</code> {next.title}</a> : <strong>End</strong>}
          </div>
        </section>

        {contributors.length > 0 && (
          <section className="project-side-section">
            <div className="project-section-heading">
              <div>
                <p className="eyebrow"><GitBranchIcon /> FOUNDATION</p>
                <h2>Unit terkait</h2>
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

        <nav className="project-lineage-nav" aria-label="Navigasi checkpoint">
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

      <main className="project-main">
        <section className="project-section">
          <div className="project-section-heading">
            <div>
              <p className="eyebrow"><Layers3 size={13} strokeWidth={1.8} aria-hidden="true" /> DELTA</p>
              <h2>Requirement baru</h2>
            </div>
            <span>{newRequirements.length}</span>
          </div>
          {newRequirements.length ? (
            <ol className="project-requirement-list">
              {newRequirements.map((criterion) => <li key={criterion.id}>{criterion.text}</li>)}
            </ol>
          ) : <p className="muted">Tidak ada requirement baru.</p>}
        </section>

        {parent && (
          <section className="project-section">
            <div className="project-section-heading">
              <div>
                <p className="eyebrow"><Link2 size={13} strokeWidth={1.8} aria-hidden="true" /> INHERITED</p>
                <h2>Guarantee yang harus tetap hidup</h2>
              </div>
              <span>{inherited.length}</span>
            </div>
            <GuaranteeAccordion
              title={inheritanceTitle ?? 'Guarantee checkpoint sebelumnya'}
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
            <p className="eyebrow"><LockKeyhole size={13} strokeWidth={1.8} aria-hidden="true" /> EVIDENCE</p>
            <h2>{ready ? 'Mulai checkpoint untuk mencatat bukti.' : 'Bukti belum dapat dicatat.'}</h2>
            {!ready && <p className="muted">Selesaikan prasyarat terlebih dahulu.</p>}
          </section>
        )}
      </main>
    </div>
  </article>;
}

function GitBranchIcon() {
  return <Layers3 size={13} strokeWidth={1.8} aria-hidden="true" />;
}
