import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import manifestSource from '../curriculum/manifest.v2.json';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { resolveGenerationContext } from '../src/domain/generation/context';

const itemId = process.argv[2];
if (!itemId) throw new Error('Gunakan: pnpm generation:prepare <ITEM-ID>');

const graph = buildCurriculumGraph(manifestSource);
const item = graph.itemsById.get(itemId);
if (!item) throw new Error('Item tidak ditemukan: ' + itemId);
if (item.kind !== 'unit') {
  throw new Error('Course generator hanya untuk unit. Project/integration memakai workspace runtime.');
}

const directory = resolve('generation', 'staging', itemId);
mkdirSync(directory, { recursive: true });

const contextPath = resolve(directory, 'context.json');
const context = resolveGenerationContext(graph, itemId);
writeFileSync(contextPath, JSON.stringify(context, null, 2) + '\n');

const sourceTemplatePath = resolve(directory, 'source-pack.template.json');
if (!existsSync(sourceTemplatePath)) {
  const curated = item.source.url
    ? [{
        title: item.source.title,
        url: item.source.url,
        tier: 0,
        supports: item.scope,
        notes: ['Curriculum-provided source. Inspect before adding other sources.'],
      }]
    : [];

  writeFileSync(sourceTemplatePath, JSON.stringify({
    itemId: item.id,
    curriculumFingerprint: item.fingerprint,
    sources: curated,
    unsupportedClaims: [
      'Replace this template with source-pack.json only after every required concept is supported.',
    ],
  }, null, 2) + '\n');
}

const specTemplatePath = resolve(directory, 'lesson-spec.template.json');
if (!existsSync(specTemplatePath)) {
  const reviewCoverage = Array.from({ length: 5 }, (_, questionIndex) => {
    const assigned = item.criteria
      .filter((_criterion, criterionIndex) => criterionIndex % 5 === questionIndex)
      .map((criterion) => criterion.id);
    if (!assigned.length && item.criteria.length) {
      assigned.push(item.criteria[questionIndex % item.criteria.length].id);
    }
    return assigned;
  });

  writeFileSync(specTemplatePath, JSON.stringify({
    itemId: item.id,
    curriculumFingerprint: item.fingerprint,
    payoff: '<one sentence payoff>',
    learningOutcomes: item.criteria.map((criterion) => criterion.text),
    mentalModel: '<central predictive mental model>',
    relationshipGraph: '<dependency / cause-effect graph>',
    concepts: item.scope.map((scope, index) => ({
      id: 'concept-' + (index + 1),
      title: scope,
      mechanism: '<explain mechanism>',
      sourceUrls: item.source.url ? [item.source.url] : [],
    })),
    misconceptions: [],
    practice: ['<guided practice aligned to challenge>'],
    coverage: [
      ...item.criteria.map((criterion) => ({
        criterionId: criterion.id,
        taughtAt: '<section>',
        assessedAt: '<quiz/practice/challenge>',
        evidenceExpected: '<observable evidence>',
      })),
      {
        criterionId: 'challenge',
        taughtAt: '<challenge preparation>',
        assessedAt: '<challenge>',
        evidenceExpected: '<challenge evidence>',
      },
    ],
    reviewQuestions: Array.from({ length: 5 }, (_, index) => ({
      id: 'q' + (index + 1),
      prompt: '<recall question>',
      options: ['<option A>', '<option B>'],
      answer: 0,
      explanation: '<repair misconception>',
      criterionIds: reviewCoverage[index],
    })),
  }, null, 2) + '\n');
}

console.log('Prepared generation staging: ' + itemId);
console.log('Context: ' + contextPath);
console.log('Next: research sources, create source-pack.json + lesson-spec.json + lesson.mdx, then run generation:validate.');
