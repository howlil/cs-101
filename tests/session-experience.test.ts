import { test } from 'node:test';
import assert from 'node:assert/strict';

import { curriculumItemFingerprint } from '../src/domain/curriculum-v2/schema';

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
