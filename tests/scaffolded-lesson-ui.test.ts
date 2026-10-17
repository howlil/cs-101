import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { learningSegmentV3Schema } from '../src/domain/generation/pedagogy';

const read = (path: string) => readFileSync(path, 'utf8');

const exampleSegment = {
  id: 'sql-null-filter',
  objective: 'Predict the result of a nullable SQL filter',
  whyItMatters: 'A financial reconciliation must not silently omit unknown statuses',
  firstAction: 'Predict whether a row with NULL status matches WHERE status <> PAID',
  mentalModel: 'WHERE retains TRUE, not FALSE or UNKNOWN',
  explanation: 'Comparisons with NULL generally evaluate to UNKNOWN.',
  prerequisiteConceptIds: [],
  workedExample: {
    problem: 'Determine the effect of a nullable filter',
    steps: [{ action: 'Evaluate NULL <> PAID', reason: 'SQL uses three-valued logic', expectedResult: 'UNKNOWN' }],
  },
  guidedPractice: {
    prompt: 'Predict the result before running the query',
    hints: ['Consider UNKNOWN', 'WHERE keeps only TRUE'],
    explanation: 'UNKNOWN does not pass the WHERE predicate.',
  },
  misconceptionRepair: {
    likelyMistake: 'NULL is the same as an ordinary non-PAID value',
    whyItFails: 'The predicate cannot establish equality or inequality against NULL',
    correctiveAction: 'Use a null-aware predicate when NULL should match',
  },
  selfCheck: {
    expectedObservation: 'The nullable row is absent from the result',
    ifUnexpected: 'Inspect the column value and predicate with IS NULL',
  },
  independentChallenge: {
    prompt: 'Run a different NOT IN query on a test fixture and predict the result',
    variationFromExample: 'Uses NOT IN and a new list of values',
    criterionIds: ['c1','challenge'],
    expectedEvidence: ['Recorded predicted result and observed rows'],
  },
  continueFromHere: {
    nextAction: 'Inspect what IS NULL changes in the same data',
    resumeCue: 'Return to the NOT IN challenge and predict once before running',
  },
};

test('V3 lesson renderer exposes every authored segment field across the three stages', () => {
  const segment = learningSegmentV3Schema.parse(exampleSegment);
  assert.equal(segment.id, 'sql-null-filter');
  const renderer = read('src/components/lesson/LearningSegments.astro');
  const expectations = [
    'segment.id', 'segment.objective', 'segment.whyItMatters', 'segment.firstAction',
    'segment.mentalModel', 'segment.explanation', 'segment.workedExample.problem',
    'segment.workedExample.steps', 'segment.guidedPractice.prompt',
    'segment.guidedPractice.hints', 'segment.guidedPractice.explanation',
    'segment.guidedPractice.starterCode', 'segment.misconceptionRepair.likelyMistake',
    'segment.misconceptionRepair.whyItFails', 'segment.misconceptionRepair.correctiveAction',
    'segment.selfCheck.expectedObservation', 'segment.selfCheck.ifUnexpected',
    'segment.independentChallenge.prompt', 'segment.independentChallenge.variationFromExample',
    'segment.independentChallenge.expectedEvidence', 'segment.continueFromHere.nextAction',
    'segment.continueFromHere.resumeCue',
  ];
  for (const field of expectations) assert.ok(renderer.includes(field), 'Missing renderer binding: ' + field);
  assert.match(renderer, /data-learning-segment=\{segment\.id\}/);
  assert.match(renderer, /aria-labelledby=/);
  assert.match(renderer, /client:load/);
});

test('one lessonSegments collection is used for each of understand, practice and evidence', () => {
  const template = read('.agents/skill/course-generator/assets/lesson-template.mdx');
  const validator = read('scripts/validate-generation.ts');
  assert.match(template, /export const lessonSegments =/);
  for (const stage of ['understand', 'practice', 'evidence']) {
    assert.ok(template.includes('<LearningSegments stage="' + stage + '" segments={lessonSegments} />'));
  }
  assert.match(validator, /V3 lesson tidak memakai shared segment renderer/);
  assert.match(validator, /pedagogy\.version === 3/);
});

test('hint disclosure and quiz feedback stay optional, keyboard-accessible and ephemeral', () => {
  const hints = read('src/components/lesson/GuidedPractice.tsx');
  const quiz = read('src/components/lesson/QuizClient.tsx');
  const worked = read('src/components/lesson/WorkedExample.astro');
  assert.match(hints, /aria-live="polite"/);
  assert.match(hints, /aria-controls=\{hintRegionId\}/);
  assert.match(hints, /setVisibleHints/);
  assert.match(quiz, /whenIncorrect/);
  assert.match(quiz, /nextAction/);
  assert.match(quiz, /setResult/);
  assert.match(worked, /predictionPrompt/);
  for (const code of [hints,quiz]) {
    assert.doesNotMatch(code, /fetch\s*\(|localStorage|sessionStorage|indexedDB|progressStore/);
  }
});

test('V3 learning renderer does not add required lesson sessions or persistence', () => {
  const renderer = read('src/components/lesson/LearningSegments.astro');
  assert.doesNotMatch(renderer, /<form|<input|progressStore|streak|timer|fetch\s*\(|localStorage/i);
  const source = read('curriculum/manifest.v2.json');
  assert.deepEqual(JSON.parse(source).items, []);
});
