import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { SessionFields } from '../src/domain/learning/schema';
import { hasSessionNotes } from '../src/components/learning/client';
import { matchesQuery } from '../src/components/arc/lib/matches-query';

const draft: SessionFields = {
  itemId: 'SQL-001',
  fingerprint: 'sha256:' + 'a'.repeat(64),
  kind: 'progress',
  evidence: [],
  continueFrom: '',
  blocker: '',
  lastAnchor: '',
};

test('empty and minutes-only drafts never become implicit sessions', () => {
  assert.equal(hasSessionNotes(undefined), false);
  assert.equal(hasSessionNotes(draft), false);
  assert.equal(hasSessionNotes({ ...draft, minutes: 42 }), false);
  assert.equal(hasSessionNotes({ ...draft, evidence: [{ criterionId: 'x', text: '   ' }] }), false);
});

test('evidence-only, next-step, blocker and reflection drafts are valid progress', () => {
  assert.equal(hasSessionNotes({ ...draft, evidence: [{ criterionId: 'x', text: 'Test passed' }] }), true);
  assert.equal(hasSessionNotes({ ...draft, continueFrom: 'Check NULL behavior' }), true);
  assert.equal(hasSessionNotes({ ...draft, blocker: 'Need help' }), true);
  assert.equal(hasSessionNotes({ ...draft, reflection: { wrongAssumption: 'I assumed joins were commutative', evidenceChangedMind: '', tradeoffChosen: '', explainWithoutNotes: '', monitorInProduction: '' } }), true);
});

test('header command search and sidebar search share token matching', () => {
  assert.equal(matchesQuery('SQL-001 Relational model / Database', 'relational SQL'), true);
  assert.equal(matchesQuery('SQL-001 Relational model / Database', '  SQL   model '), true);
  assert.equal(matchesQuery('SQL-001 Relational model / Database', 'mutex SQL'), false);
  assert.equal(matchesQuery('SQL-001', ''), true);
});

test('navigation uses page semantics only for the actual page', () => {
  const sidebar = readFileSync(new URL('../src/components/app/AppSidebar.tsx', import.meta.url), 'utf8');
  assert.match(sidebar, /aria-current=\{currentPath === href \? 'page'/);
  assert.match(sidebar, /data-section-current=/);
});

test('project and integration expose a post-completion next action', () => {
  for (const component of ['ProjectPage', 'IntegrationPage']) {
    const source = readFileSync(new URL('../src/components/pages/' + component + '.tsx', import.meta.url), 'utf8');
    assert.match(source, /passed && <div className=/);
    assert.match(source, /<ActionLink href=/);
  }
});
