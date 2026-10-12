import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('lesson evidence defaults to compact disclosure, not a mandatory form', () => {
  const lesson = read('src/components/pages/LessonPage.tsx');
  const form = read('src/components/learning/EvidenceForm.tsx');
  assert.doesNotMatch(lesson, /<SessionLogger\s+initialCompletionOpen/);
  assert.match(form, /session-form--quiet/);
  assert.match(form, /aria-controls="completion-evidence"/);
  assert.match(form, /aria-controls="session-notes"/);
  assert.match(form, /\{completionOpen && \(/);
  assert.match(form, /\{sessionNotesOpen && \(/);
  assert.match(form, /setCompletionOpen\(initialCompletionOpen \|\| draft.evidence.length > 0\)/);
  assert.match(form, /Draft otomatis tersimpan di browser ini; belum tercatat sebagai sesi/);
});

test('save and completion keep the original server-owned session contract', () => {
  const form = read('src/components/learning/EvidenceForm.tsx');
  const lesson = read('src/components/pages/LessonPage.tsx');
  assert.match(form, /const submit = async \(kind: 'progress' \| 'passed'\)/);
  assert.match(form, /postJson<MutationResult>\('\/api\/sessions'/);
  assert.match(form, /revision: currentRevision/);
  assert.match(form, /requestId: request.current.id/);
  assert.match(form, /navigate\(window.location.href, \{ history: 'replace' \}\)/);
  assert.match(lesson, /visibleState.status !== 'passed'/);
  assert.doesNotMatch(lesson, /set.*[Pp]rogress|set.*[Cc]ompletion/);
});

test('mandatory project/integration proof remains mandatory behind presentation-only disclosures', () => {
  const form = read('src/components/learning/EvidenceForm.tsx');
  const project = read('src/components/learning/ProjectEvidence.tsx');
  const integration = read('src/components/learning/IntegrationEvidence.tsx');
  assert.match(project, /collapsible: true/);
  assert.match(integration, /collapsible: true/);
  assert.match(form, /setExpandedGroups/);
  assert.match(form, /missing\.some\(\(entry\) => entry.id === criterion.id\)/);
  assert.match(form, /getElementsByName\('evidence:' \+ missing\[0\]\.id\)/);
  assert.match(form, /group.criteria.map\(\(criterion\) =>/);
});

test('textarea handlers snapshot values synchronously before React queues state updates', () => {
  const form = read('src/components/learning/EvidenceForm.tsx');
  assert.doesNotMatch(form, /setReflection\(\(current\) => \([\s\S]{0,110}event\.currentTarget\.value/);
  assert.doesNotMatch(form, /setEvidence\(\(current\) => \([\s\S]{0,150}event\.currentTarget\.value/);
  assert.match(form, /const value = event\.currentTarget\.value/);
});
