import { test } from 'node:test';
import assert from 'node:assert/strict';

import { sessionFields } from '../src/domain/learning/schema';
import { curriculumItemFingerprint } from '../src/domain/curriculum-v2/schema';

test('session payload menyimpan reflection dan minutes tanpa mengubah kontrak evidence', () => {
  const parsed = sessionFields.parse({
    itemId: 'SQL-001',
    fingerprint: 'sha256:' + 'a'.repeat(64),
    kind: 'progress',
    evidence: [],
    continueFrom: 'Ulangi tiga kasus NULL.',
    lastAnchor: 'challenge',
    minutes: 35,
    reflection: {
      wrongAssumption: 'NOT IN sama dengan NOT EXISTS.',
      evidenceChangedMind: 'NULL membuat hasil UNKNOWN.',
      tradeoffChosen: '',
      explainWithoutNotes: 'Saya bisa menjelaskan three-valued logic.',
      monitorInProduction: '',
    },
  });

  assert.equal(parsed.minutes, 35);
  assert.equal(parsed.reflection?.evidenceChangedMind, 'NULL membuat hasil UNKNOWN.');
  assert.equal(parsed.continueFrom, 'Ulangi tiga kasus NULL.');
});

test('reflection prompt tidak membuat completion lama stale', () => {
  const base = {
    id: 'SQL-001',
    kind: 'unit' as const,
    trackId: 'db-sql',
    moduleId: 'db-sql-core',
    order: 1,
    title: 'Relational model',
    scope: ['NULL'],
    criteria: [{ id: 'c1', text: 'Explain NULL' }],
    challenge: { title: 'Minefield', steps: ['Predict'], raw: 'Minefield\n- Predict' },
    prerequisites: [],
    marketExpectation: ['Write correct SQL'],
    source: { title: 'PostgreSQL' },
    crossModuleReferenceRaw: [],
  };

  assert.equal(
    curriculumItemFingerprint(base),
    curriculumItemFingerprint({
      ...base,
      reflectionPrompts: ['Wrong assumption:', 'Evidence that changed my mind:'],
    }),
  );
});
