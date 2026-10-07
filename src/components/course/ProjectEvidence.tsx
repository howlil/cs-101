"use client";

import type { Criterion } from '../../domain/curriculum-v2/schema';
import EvidenceForm, { type EvidenceGroup } from '../learning/EvidenceForm';

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
    eyebrow: 'EVIDENCE',
    title: 'Requirement baru',
    description: 'Buktikan perubahan yang ditambahkan pada checkpoint ini.',
    criteria: newRequirements,
    className: 'project-evidence-section',
  }];

  if (inheritanceCriteria.length) {
    groups.push({
      key: 'inherited',
      eyebrow: 'REGRESSION GUARANTEE',
      title: 'Inherited guarantees',
      description: 'Berikan evidence bahwa guarantee yang diwariskan masih tetap berlaku.',
      criteria: inheritanceCriteria,
      className: 'project-evidence-section project-evidence-section--inherited',
      referenceTitle: 'Lihat guarantee dari checkpoint sebelumnya',
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
    passLabel="Ajukan checkpoint selesai"
  />;
}
