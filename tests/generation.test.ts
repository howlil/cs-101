import { test } from 'node:test';
import assert from 'node:assert/strict';

import actualManifest from '../curriculum/manifest.v2.json';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { resolveGenerationContext } from '../src/domain/generation/context';
import {
  buildGenerationRecord,
  buildReviewBank,
  validateGenerationPlan,
} from '../src/domain/generation/validate';
import { requiredEvidenceForItem } from '../src/domain/learning/rules';

const graph = buildCurriculumGraph(actualManifest);

test('generation context deterministic dan dibatasi ke neighborhood kecil', () => {
  const unit = graph.manifest.items.find((item) => item.kind === 'unit' && item.source.url);
  assert.ok(unit && unit.kind === 'unit');

  const first = resolveGenerationContext(graph, unit.id);
  const second = resolveGenerationContext(graph, unit.id);
  assert.deepEqual(first, second);
  assert.equal(first.target.id, unit.id);
  assert.deepEqual(first.prerequisites.map((item) => item.id), unit.prerequisites);
  assert.ok(first.moduleContext.length <= 4);
  assert.ok(first.connections.related.length <= 3);
  assert.ok(first.connections.deepDive.length <= 2);
  assert.ok(first.connections.foundation.length <= 3);
  assert.ok(first.connections.contributesTo.length <= 3);

  const contextIds = new Set([
    first.target.id,
    ...first.prerequisites.map((item) => item.id),
    ...first.moduleContext.map((item) => item.id),
    ...first.projectLineage.map((item) => item.id),
    ...first.connections.related.map((item) => item.id),
    ...first.connections.deepDive.map((item) => item.id),
    ...first.connections.foundation.map((item) => item.id),
    ...first.connections.contributesTo.map((item) => item.id),
  ]);
  assert.ok(contextIds.size < graph.manifest.items.length / 3);
});

test('contributes_to menentukan nearest checkpoint tanpa menjadikannya prerequisite', () => {
  const relation = graph.manifest.relations.find((entry) => entry.type === 'contributes_to');
  assert.ok(relation);
  const source = graph.itemsById.get(relation.from!);
  const target = graph.itemsById.get(relation.to!);
  assert.ok(source && target?.kind === 'checkpoint');

  const context = resolveGenerationContext(graph, source!.id);
  assert.equal(context.nearestCheckpoint?.id, target!.id);
  assert.equal(
    context.prerequisites.some((item) => item.id === target!.id),
    source!.prerequisites.includes(target!.id),
  );
});

test('generation plan harus menutup seluruh criterion, source, dan review coverage', () => {
  const unit = graph.manifest.items.find((item) =>
    item.kind === 'unit' &&
    item.source.url &&
    item.criteria.length <= 5
  );
  assert.ok(unit && unit.kind === 'unit' && unit.source.url);

  const expected = requiredEvidenceForItem(unit);
  const questions = Array.from({ length: 5 }, (_, index) => ({
    id: 'q' + (index + 1),
    prompt: 'Reasoning question ' + (index + 1),
    options: ['A', 'B'],
    answer: 0,
    explanation: 'Repairs a misconception.',
    criterionIds: [] as string[],
  }));
  unit.criteria.forEach((criterion, index) => {
    questions[index % questions.length].criterionIds.push(criterion.id);
  });

  const sourcePack = {
    itemId: unit.id,
    curriculumFingerprint: unit.fingerprint,
    sources: [{
      title: unit.source.title,
      url: unit.source.url,
      tier: 0,
      supports: unit.scope,
      notes: ['Fixture'],
    }],
    unsupportedClaims: [],
  };

  const spec = {
    itemId: unit.id,
    curriculumFingerprint: unit.fingerprint,
    payoff: 'Predict the important behavior.',
    learningOutcomes: unit.criteria.map((criterion) => criterion.text),
    mentalModel: 'Input → mechanism → observable result.',
    relationshipGraph: 'input -> mechanism -> output',
    concepts: [{
      id: 'core',
      title: unit.scope[0],
      mechanism: 'Mechanism explanation.',
      sourceUrls: [unit.source.url],
    }],
    misconceptions: ['Wrong model'],
    practice: ['Predict before execution'],
    coverage: expected.map((criterion) => ({
      criterionId: criterion.id,
      taughtAt: 'Core',
      assessedAt: criterion.id === 'challenge' ? 'Challenge' : 'Quiz',
      evidenceExpected: 'Observable evidence',
    })),
    reviewQuestions: questions,
  };

  const validated = validateGenerationPlan(graph, unit.id, sourcePack, spec);
  const record = buildGenerationRecord(validated.sourcePack, validated.lessonSpec);
  const bank = buildReviewBank(validated.sourcePack, validated.lessonSpec);

  assert.equal(record.itemId, unit.id);
  assert.equal(record.coverage.length, expected.length);
  assert.equal(bank.questions.length, 5);
  assert.equal(bank.curriculumFingerprint, unit.fingerprint);

  assert.throws(
    () => validateGenerationPlan(
      graph,
      unit.id,
      sourcePack,
      { ...spec, coverage: spec.coverage.slice(1) },
    ),
    /Coverage hilang/,
  );

  assert.throws(
    () => validateGenerationPlan(
      graph,
      unit.id,
      { ...sourcePack, unsupportedClaims: ['unsupported'] },
      spec,
    ),
    /unsupported claim/,
  );

  assert.throws(
    () => validateGenerationPlan(
      graph,
      unit.id,
      sourcePack,
      {
        ...spec,
        concepts: [{ ...spec.concepts[0], sourceUrls: ['https://example.invalid/not-in-pack'] }],
      },
    ),
    /source di luar source pack/,
  );

  const uncoveredQuestions = questions.map((question) => ({ ...question, criterionIds: [] }));
  assert.throws(
    () => validateGenerationPlan(
      graph,
      unit.id,
      sourcePack,
      { ...spec, reviewQuestions: uncoveredQuestions },
    ),
    /Review bank tidak menguji criterion/,
  );
});

test('course generator menolak checkpoint dan integration sebagai lesson biasa', () => {
  const checkpoint = graph.manifest.items.find((item) => item.kind === 'checkpoint');
  const integration = graph.manifest.items.find((item) => item.kind === 'integration');
  assert.ok(checkpoint && integration);

  const fakePack = {
    itemId: checkpoint!.id,
    curriculumFingerprint: checkpoint!.fingerprint,
    sources: [{ title: 'Source', url: 'https://example.com', tier: 0, supports: ['x'], notes: [] }],
    unsupportedClaims: [],
  };
  const fakeSpec = {
    itemId: checkpoint!.id,
    curriculumFingerprint: checkpoint!.fingerprint,
    payoff: 'x',
    learningOutcomes: ['x'],
    mentalModel: 'x',
    relationshipGraph: 'x',
    concepts: [{ id: 'x', title: 'x', mechanism: 'x', sourceUrls: ['https://example.com'] }],
    misconceptions: [],
    practice: ['x'],
    coverage: [{ criterionId: 'x', taughtAt: 'x', assessedAt: 'x', evidenceExpected: 'x' }],
    reviewQuestions: Array.from({ length: 5 }, (_, i) => ({
      id: 'q' + i,
      prompt: 'x',
      options: ['a', 'b'],
      answer: 0,
      explanation: 'x',
      criterionIds: [],
    })),
  };

  assert.throws(
    () => validateGenerationPlan(graph, checkpoint!.id, fakePack, fakeSpec),
    /hanya menerima unit/,
  );
  assert.throws(
    () => validateGenerationPlan(
      graph,
      integration!.id,
      { ...fakePack, itemId: integration!.id, curriculumFingerprint: integration!.fingerprint },
      { ...fakeSpec, itemId: integration!.id, curriculumFingerprint: integration!.fingerprint },
    ),
    /hanya menerima unit/,
  );
});
