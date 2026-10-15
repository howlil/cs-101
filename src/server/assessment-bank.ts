import type { AssessmentQuestion } from '../domain/learning/assessment';

const fingerprint = 'sha256:b1b18a1cd01a9bc0db3adef707acaf05afc4291aedf96d250a9126ca08e5bf67';
const QUESTIONS: readonly AssessmentQuestion[] = [
  {
    id: 'sql-null-predict-01', version: 'v1', itemId: 'SQL-001', curriculumFingerprint: fingerprint,
    competencyId: 'sql-001-null-logic', phase: 'practice',
    prompt: 'Apa hasil SELECT 1 WHERE NULL = NULL?',
    options: ['Satu baris berisi 1', 'Tidak ada baris', 'Query error'],
    answer: 1,
    explanation: 'Perbandingan biasa dengan NULL menghasilkan UNKNOWN. WHERE hanya mempertahankan baris dengan kondisi TRUE.',
    misconceptions: {
      0: 'NULL bukan nilai yang bisa dibandingkan sama dengan NULL menggunakan operator = biasa.',
      2: 'Query ini valid secara sintaks. WHERE mengevaluasi UNKNOWN dan menyaring baris tersebut.',
    },
  },
  {
    id: 'sql-null-transfer-01', version: 'v1', itemId: 'SQL-001', curriculumFingerprint: fingerprint,
    competencyId: 'sql-001-null-logic', phase: 'transfer',
    prompt: 'Query mana yang dengan tepat menemukan baris dengan email NULL?',
    options: ["WHERE email = NULL", "WHERE email IS NULL", "WHERE email <> NULL"],
    answer: 1,
    explanation: 'IS NULL menguji ketiadaan nilai. Operator = dan <> dengan NULL menghasilkan UNKNOWN.',
    misconceptions: { 0: '= NULL tidak menghasilkan TRUE.', 2: '<> NULL juga menghasilkan UNKNOWN.' },
  },
  {
    id: 'sql-null-transfer-02', version: 'v1', itemId: 'SQL-001', curriculumFingerprint: fingerprint,
    competencyId: 'sql-001-null-logic', phase: 'transfer',
    prompt: "Untuk x=NULL, apakah WHERE x = 1 OR x IS NULL mempertahankan baris?",
    options: ['Ya', 'Tidak', 'Query error'],
    answer: 0,
    explanation: 'UNKNOWN OR TRUE menghasilkan TRUE, sehingga WHERE mempertahankan baris.',
    misconceptions: { 1: 'IS NULL menghasilkan TRUE; UNKNOWN OR TRUE juga TRUE.', 2: 'Predikat tersebut valid.' },
  },
  {
    id: 'sql-null-recall-01', version: 'v1', itemId: 'SQL-001', curriculumFingerprint: fingerprint,
    competencyId: 'sql-001-null-logic', phase: 'recall',
    prompt: "Apa yang terjadi pada baris status NULL saat WHERE status <> 'PAID'?",
    options: ['Baris tetap ditampilkan', 'Baris tidak ditampilkan', 'Query gagal dieksekusi'],
    answer: 1,
    explanation: 'NULL <> nilai menghasilkan UNKNOWN, bukan TRUE. Baris tersebut tidak melewati WHERE.',
    misconceptions: {
      0: 'NULL bukan status non-PAID yang diketahui; perbandingan dengan NULL menghasilkan UNKNOWN.',
      2: 'Perbandingan dengan NULL tidak membuat query error; hasil predikatnya UNKNOWN.',
    },
  },
];
export function assessmentQuestion(id: string) { return QUESTIONS.find((q) => q.id === id); }
export function assessmentQuestionsForItem(itemId: string) { return QUESTIONS.filter((q) => q.itemId === itemId); }
export function assessedItemIds() { return [...new Set(QUESTIONS.map((q) => q.itemId))]; }
