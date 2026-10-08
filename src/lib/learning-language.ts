export const learnerCopy = {
  kind: {
    unit: 'Materi',
    checkpoint: 'Project',
    integration: 'Latihan gabungan',
  },
  state: {
    ready: 'Bisa dimulai',
    active: 'Sedang dikerjakan',
    started: 'Pernah mulai',
    passed: 'Selesai',
    stale: 'Perlu diperbarui',
    locked: 'Terkunci',
    unknown: 'Belum mulai',
  },
  relation: {
    requires: 'Harus selesai dulu',
    usedLaterBy: 'Dipakai nanti',
    related: 'Terkait',
    deepDive: 'Pendalaman',
    builtOnFoundation: 'Materi dasar',
    foundationFor: 'Dasar untuk',
    contributesTo: 'Dipakai di project',
  },
} as const;

export const connectionLabels = learnerCopy.relation;

export function reviewStateLabel(state: string) {
  if (state === 'due') return 'Review hari ini';
  if (state === 'retry') return 'Perlu diulang';
  if (state === 'retained') return 'Review selesai';
  if (state === 'scheduled') return 'Terjadwal';
  return '';
}
