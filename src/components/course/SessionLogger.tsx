"use client";

import type { Criterion } from '../../domain/curriculum-v2/schema';
import EvidenceForm from '../learning/EvidenceForm';

export default function SessionLogger({
  itemId,
  fingerprint,
  criteria,
  revision,
  continueFrom = '',
  lastAnchor = '',
}: {
  itemId: string;
  fingerprint: string;
  criteria: Criterion[];
  revision: number;
  continueFrom?: string;
  lastAnchor?: string;
}) {
  return <EvidenceForm
    itemId={itemId}
    fingerprint={fingerprint}
    revision={revision}
    continueFrom={continueFrom}
    lastAnchor={lastAnchor}
    groups={[{
      key: 'criteria',
      title: 'Selesai jika',
      description: 'Tambahkan bukti ketika target ini sudah benar-benar terpenuhi.',
      criteria,
    }]}
  />;
}
