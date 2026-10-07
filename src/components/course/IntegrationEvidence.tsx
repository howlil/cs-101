"use client";

import type { Criterion } from '../../domain/curriculum-v2/schema';
import EvidenceForm from '../learning/EvidenceForm';

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
      eyebrow: 'EVIDENCE',
      title: 'Definition of Done',
      criteria,
      className: 'integration-evidence-section',
    },
    ...(requirements.length ? [{
      key: 'artifact',
      eyebrow: 'ARTIFACT',
      title: 'Output yang harus dibawa',
      criteria: requirements,
      className: 'integration-evidence-section',
    }] : []),
    {
      key: 'challenge',
      eyebrow: 'CHALLENGE',
      title: challengeCriterion.text,
      criteria: [{ ...challengeCriterion, text: 'Bukti challenge' }],
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
    passLabel="Kirim bukti & selesaikan integration"
  />;
}
