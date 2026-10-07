"use client";

import {
  ArrowLeft,
  Boxes,
  Check,
  CheckCircle2,
  Circle,
  LockKeyhole,
  PackageCheck,
  Target,
  TriangleAlert,
} from 'lucide-react';
import type { Criterion } from '../../domain/curriculum-v2/schema';
import ActivateItem from '../learning/ActivateItem';
import { Badge } from '../arc/badge/badge';
import IntegrationEvidence from '../course/IntegrationEvidence';
import ConnectionsPanel, { type ConnectionGroupData } from '../curriculum/ConnectionsPanel';

type Prerequisite = { id: string; title: string; href: string; passed: boolean };

export default function IntegrationPage({
  id,
  title,
  brief,
  fingerprint,
  prerequisites,
  scope,
  challenge,
  criteria,
  requirements,
  challengeCriterion,
  passed,
  stale,
  active,
  ready,
  missingPrerequisites,
  revision,
  continueFrom,
  lastAnchor,
  connections,
}: {
  id: string;
  title: string;
  brief: string;
  fingerprint: string;
  prerequisites: Prerequisite[];
  scope: string[];
  challenge: { title: string; steps: string[] };
  criteria: Criterion[];
  requirements: Criterion[];
  challengeCriterion: Criterion;
  passed: boolean;
  stale: boolean;
  active: boolean;
  ready: boolean;
  missingPrerequisites: string[];
  revision: number;
  continueFrom?: string;
  lastAnchor?: string;
  connections: ConnectionGroupData[];
}) {
  return <article className="integration-workspace">
    <header className="integration-header">
      <a className="integration-back" href="/curriculum">
        <ArrowLeft size={14} strokeWidth={1.8} aria-hidden="true" />
        <span>Curriculum</span>
      </a>
      <p className="eyebrow"><Boxes size={13} strokeWidth={1.8} aria-hidden="true" /> CROSS-TRACK INTEGRATION</p>
      <div className="integration-kicker">
        <code>{id}</code>
        <span>{prerequisites.length} prerequisite</span>
      </div>
      <h1>{title}</h1>
      <p className="integration-brief">{brief}</p>

      <div className="integration-status-row">
        {passed ? (
          <Badge tone="success" icon={<CheckCircle2 size={14} strokeWidth={1.8} />}>Selesai</Badge>
        ) : stale && !active ? (
          <>
            <Badge tone="warning" icon={<TriangleAlert size={14} strokeWidth={1.8} />}>Perlu diperbarui</Badge>
            {ready && <ActivateItem itemId={id} label="Perbarui & validasi" />}
          </>
        ) : active ? (
          <Badge tone="info" icon={<Boxes size={14} strokeWidth={1.8} />}>Sedang dikerjakan</Badge>
        ) : ready ? (
          <ActivateItem itemId={id} label="Mulai integration" />
        ) : (
          <Badge tone="neutral" icon={<LockKeyhole size={14} strokeWidth={1.8} />}>
            Terkunci · selesaikan {missingPrerequisites.join(', ') || 'prerequisite'}
          </Badge>
        )}
      </div>
    </header>

    <section className="integration-section">
      <div className="integration-section-heading">
        <div>
          <p className="eyebrow"><LockKeyhole size={13} strokeWidth={1.8} aria-hidden="true" /> READINESS</p>
          <h2>Cross-track prerequisite</h2>
        </div>
        <span>{prerequisites.filter((entry) => entry.passed).length}/{prerequisites.length}</span>
      </div>
      <div className="integration-prerequisites">
        {prerequisites.map((item) => (
          <a href={item.href} key={item.id}>
            <span className={['integration-prerequisite-state', item.passed ? 'is-passed' : ''].filter(Boolean).join(' ')} aria-hidden="true">
              {item.passed ? <Check size={14} strokeWidth={1.8} /> : <Circle size={14} strokeWidth={1.8} />}
            </span>
            <code>{item.id}</code>
            <span>{item.title}</span>
          </a>
        ))}
      </div>
    </section>

    <section className="integration-section">
      <p className="eyebrow"><Boxes size={13} strokeWidth={1.8} aria-hidden="true" /> SCOPE</p>
      <h2>Apa yang diintegrasikan</h2>
      <ul className="integration-list">{scope.map((entry) => <li key={entry}>{entry}</li>)}</ul>
    </section>

    <section className="integration-section integration-challenge">
      <div className="integration-section-heading">
        <h2><Target size={14} strokeWidth={1.8} aria-hidden="true" /> {challenge.title}</h2>
        <span>Challenge</span>
      </div>
      {challenge.steps.length > 0 && (
        <ol className="integration-list">{challenge.steps.map((step) => <li key={step}>{step}</li>)}</ol>
      )}
    </section>

    <section className="integration-section">
      <div className="integration-section-heading">
        <div>
          <p className="eyebrow"><CheckCircle2 size={13} strokeWidth={1.8} aria-hidden="true" /> DONE</p>
          <h2>Definition of Done</h2>
        </div>
        <span>{criteria.length}</span>
      </div>
      <ol className="integration-list">{criteria.map((criterion) => <li key={criterion.id}>{criterion.text}</li>)}</ol>
    </section>

    {requirements.length > 0 && (
      <section className="integration-section">
        <div className="integration-section-heading">
          <div>
            <p className="eyebrow"><PackageCheck size={13} strokeWidth={1.8} aria-hidden="true" /> OUTPUT</p>
            <h2>Artifact yang harus dibawa</h2>
          </div>
          <span>{requirements.length}</span>
        </div>
        <ol className="integration-list">{requirements.map((criterion) => <li key={criterion.id}>{criterion.text}</li>)}</ol>
      </section>
    )}

    <ConnectionsPanel groups={connections} />

    {active && !passed ? (
      <IntegrationEvidence
        itemId={id}
        fingerprint={fingerprint}
        criteria={criteria}
        requirements={requirements}
        challengeCriterion={challengeCriterion}
        revision={revision}
        continueFrom={continueFrom}
        lastAnchor={lastAnchor}
      />
    ) : !passed && (
      <section className="integration-section integration-evidence-placeholder">
        <p className="eyebrow"><LockKeyhole size={13} strokeWidth={1.8} aria-hidden="true" /> EVIDENCE</p>
        <h2>{ready ? 'Mulai integrasi untuk mencatat bukti.' : 'Bukti belum dapat dicatat.'}</h2>
        <p className="muted">{ready ? 'Mulai integrasi untuk membuka form bukti.' : 'Selesaikan seluruh prasyarat terlebih dahulu.'}</p>
      </section>
    )}
  </article>;
}
