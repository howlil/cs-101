"use client";

import type { ReactNode } from 'react';
import { BookOpen, ListTree, TriangleAlert } from 'lucide-react';
import type { Criterion } from '../../domain/curriculum-v2/schema';
import { Alert } from '../arc/alert/alert';
import EmptyAction from '../arc/EmptyAction';
import ActivateItem from '../learning/ActivateItem';
import SessionLogger from '../course/SessionLogger';
import ConnectionsPanel, { type ConnectionGroupData } from '../curriculum/ConnectionsPanel';

export default function LessonPage({
  itemId,
  title,
  description,
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
  children,
}: {
  itemId: string;
  title: string;
  description?: string;
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
  children?: ReactNode;
}) {
  if (!available) {
    return <div className="content">
      <p className="eyebrow"><BookOpen size={13} strokeWidth={1.8} aria-hidden="true" /> {itemId}</p>
      <h1>{title}</h1>
      <EmptyAction
        title="Materi belum tersedia."
        description="Lesson untuk unit ini belum dibuat. Scope dan challenge tetap bisa dilihat dari curriculum."
        href={curriculumHref}
        actionLabel="Kembali ke curriculum"
      />
      <ConnectionsPanel groups={connections} compact />
    </div>;
  }

  return <div className="lesson-grid">
    <article className="prose">
      <p className="eyebrow"><BookOpen size={13} strokeWidth={1.8} aria-hidden="true" /> {itemId}</p>
      <h1>{title}</h1>
      {description && <p className="lede">{description}</p>}

      {stale && (
        <Alert title="Materi perlu diperbarui" tone="warning">
          <TriangleAlert size={14} strokeWidth={1.8} aria-hidden="true" /> Bukti sebelumnya tetap tersimpan.
        </Alert>
      )}
      {continueFrom && <Alert title="Lanjut dari">{continueFrom}</Alert>}

      {!active && (
        <div className="actions">
          <ActivateItem itemId={itemId} label="Jadikan item aktif" />
        </div>
      )}

      {children}

      <ConnectionsPanel groups={connections} compact />

      {active && (
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
