"use client";

import type { Criterion } from '../../domain/curriculum-v2/schema';
import EvidenceForm from './EvidenceForm';

export default function SessionLogger({
  itemId,
  fingerprint,
  criteria,
  revision,
  continueFrom = '',
  lastAnchor = '',
  initialCompletionOpen = false,
}: {
  itemId: string;
  fingerprint: string;
  criteria: Criterion[];
  revision: number;
  continueFrom?: string;
  lastAnchor?: string;
  initialCompletionOpen?: boolean;
}) {
  return <EvidenceForm
    itemId={itemId}
    fingerprint={fingerprint}
    revision={revision}
    continueFrom={continueFrom}
    lastAnchor={lastAnchor}
    initialCompletionOpen={initialCompletionOpen}
    groups={[{
      key: 'criteria',
      title: 'Selesai jika',
      description: 'Tambahkan bukti ketika target ini sudah benar-benar terpenuhi.',
      criteria,
    }]}
  />;
}
