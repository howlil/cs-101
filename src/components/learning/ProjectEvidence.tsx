"use client";

import type { Criterion } from '../../domain/curriculum-v2/schema';
import EvidenceForm, { type EvidenceGroup } from './EvidenceForm';

export default function ProjectEvidence({
  itemId,
  fingerprint,
  newRequirements,
  inheritanceCriteria,
  inheritedGuarantees,
  revision,
  continueFrom = '',
  lastAnchor = '',
}: {
  itemId: string;
  fingerprint: string;
  newRequirements: Criterion[];
  inheritanceCriteria: Criterion[];
  inheritedGuarantees: Criterion[];
  revision: number;
  continueFrom?: string;
  lastAnchor?: string;
}) {
  const groups: EvidenceGroup[] = [{
    key: 'new',
    eyebrow: 'BUKTI',
    title: 'Yang harus dikerjakan di project ini',
    description: 'Tambahkan bukti untuk target baru di project ini.',
    criteria: newRequirements,
    className: 'project-evidence-section',
  }];

  if (inheritanceCriteria.length) {
    groups.push({
      key: 'inherited',
      eyebrow: 'DARI PROJECT SEBELUMNYA',
      title: 'Yang harus tetap benar',
      description: 'Buktikan bahwa target dari project sebelumnya masih tetap benar.',
      criteria: inheritanceCriteria,
      collapsible: true,
      className: 'project-evidence-section project-evidence-section--inherited',
      referenceTitle: 'Lihat target dari project sebelumnya',
      referenceItems: inheritedGuarantees.map((criterion) => criterion.text),
    });
  }

  return <EvidenceForm
    itemId={itemId}
    fingerprint={fingerprint}
    revision={revision}
    continueFrom={continueFrom}
    lastAnchor={lastAnchor}
    groups={groups}
    className="project-evidence-form"
    passLabel="Kirim bukti & selesaikan project"
  />;
}
