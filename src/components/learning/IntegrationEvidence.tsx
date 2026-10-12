"use client";

import type { Criterion } from '../../domain/curriculum-v2/schema';
import EvidenceForm from './EvidenceForm';

export default function IntegrationEvidence({
  itemId,
  fingerprint,
  criteria,
  requirements,
  challengeCriterion,
  revision,
  continueFrom = '',
  lastAnchor = '',
}: {
  itemId: string;
  fingerprint: string;
  criteria: Criterion[];
  requirements: Criterion[];
  challengeCriterion: Criterion;
  revision: number;
  continueFrom?: string;
  lastAnchor?: string;
}) {
  const groups = [
    {
      key: 'dod',
      eyebrow: 'BUKTI',
      title: 'Selesai jika',
      criteria,
      className: 'integration-evidence-section',
    },
    ...(requirements.length ? [{
      key: 'artifact',
      eyebrow: 'HASIL',
      title: 'Hasil yang harus dibuat',
      criteria: requirements,
      collapsible: true,
      className: 'integration-evidence-section',
    }] : []),
    {
      key: 'challenge',
      eyebrow: 'LATIHAN',
      title: challengeCriterion.text,
      criteria: [{ ...challengeCriterion, text: 'Bukti latihan' }],
      rows: 3,
      className: 'integration-evidence-section',
    },
  ];

  return <EvidenceForm
    itemId={itemId}
    fingerprint={fingerprint}
    revision={revision}
    continueFrom={continueFrom}
    lastAnchor={lastAnchor}
    groups={groups}
    className="integration-evidence-form"
    passLabel="Kirim bukti & selesaikan latihan"
  />;
}
