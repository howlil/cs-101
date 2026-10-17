import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { parse } from 'yaml';

import manifestSource from '../curriculum/manifest.v2.json';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { validateGenerationPlan, buildGenerationRecord, buildReviewBank } from '../src/domain/generation/validate';
import { assertV3LessonBindings } from '../src/domain/generation/verification';
import { executeExamples } from './lib/executable-proof';
import { executablePlanSchema } from '../src/domain/generation/executable-schema';

const itemId = process.argv[2];
if (!itemId) throw new Error('Gunakan: pnpm generation:validate <ITEM-ID>');

const graph = buildCurriculumGraph(manifestSource);
const item = graph.itemsById.get(itemId);
if (!item) throw new Error('Item tidak ditemukan: ' + itemId);
if (item.kind !== 'unit') throw new Error('Generation validation hanya untuk unit.');

const directory = resolve('generation', 'staging', itemId);
const sourcePackPath = resolve(directory, 'source-pack.json');
const specPath = resolve(directory, 'lesson-spec.json');
const lessonPath = resolve(directory, 'lesson.mdx');

for (const path of [sourcePackPath, specPath, lessonPath]) {
  if (!existsSync(path)) throw new Error('Artifact staging belum ada: ' + path);
}

const { sourcePack, lessonSpec } = validateGenerationPlan(
  graph,
  itemId,
  JSON.parse(readFileSync(sourcePackPath, 'utf8')),
  JSON.parse(readFileSync(specPath, 'utf8')),
);

// Older authored units remain readable; every NEW lesson must use V3.
const previouslyPublished = existsSync(resolve('generation', itemId + '.json'));
if (!previouslyPublished && lessonSpec.pedagogy?.version !== 3) {
  throw new Error('Materi baru wajib memiliki Pedagogy V3 (first action, self-check, feedback, continuation).');
}

const lesson = readFileSync(lessonPath, 'utf8');
const frontmatter = lesson.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!frontmatter) throw new Error('lesson.mdx tidak punya frontmatter.');

const data = parse(frontmatter[1]) as Record<string, unknown>;
if (data.taskId !== item.id) {
  throw new Error('Lesson frontmatter taskId harus sama dengan Item ID.');
}
if (data.demo !== false) {
  throw new Error('Generated curriculum lesson harus demo: false.');
}
if (typeof data.title !== 'string' || !data.title.trim()) {
  throw new Error('Lesson frontmatter title wajib ada.');
}
if (typeof data.description !== 'string' || !data.description.trim()) {
  throw new Error('Lesson frontmatter description wajib ada.');
}
if (data.curriculumFingerprint !== item.fingerprint) {
  throw new Error('Lesson frontmatter stale.');
}

if (lessonSpec.pedagogy) {
  if (lessonSpec.pedagogy.version === 3) {
    assertV3LessonBindings(lesson, item.id);
  } else {
    // Preserve V2 authored lesson rendering for backward compatibility.
    for (const component of ['WorkedExample', 'GuidedPractice']) {
      if (!lesson.includes('<' + component)) {
        throw new Error('Pedagogy V2 belum dirender di MDX: ' + component);
      }
    }
  }
  if (lessonSpec.pedagogy.projectBridge && !lesson.includes('<ProjectContribution')) {
    throw new Error('Project bridge dari metadata belum dirender pada lesson.');
  }
}

const requiredImports = [
  'MentalModel',
  'ConceptGraph',
  'Quiz',
  'Challenge',
  'ExitCriteria',
  'SourceList',
];
for (const name of requiredImports) {
  if (!lesson.includes(name)) throw new Error('Lesson belum memakai component wajib: ' + name);
}

for (const prerequisite of item.prerequisites) {
  if (!lesson.includes(prerequisite)) {
    throw new Error('Lesson tidak mereferensikan direct prerequisite: ' + prerequisite);
  }
}

for (const source of sourcePack.sources) {
  if (!lesson.includes(source.url)) {
    throw new Error('Source pack belum tercermin di lesson: ' + source.url);
  }
}

const derivedDirectory = resolve(directory, 'derived');
mkdirSync(derivedDirectory, { recursive: true });
writeFileSync(
  resolve(derivedDirectory, 'generation-record.json'),
  JSON.stringify(buildGenerationRecord(sourcePack, lessonSpec), null, 2) + '\n',
);
writeFileSync(
  resolve(derivedDirectory, 'review-bank.json'),
  JSON.stringify(buildReviewBank(lessonSpec), null, 2) + '\n',
);
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
let v3Hashes: Record<string, string> = {};
if (lessonSpec.pedagogy?.version === 3) {
  const planPath = resolve(directory, 'executable-examples.json');
  if (!existsSync(planPath)) throw new Error('V3 wajib memiliki executable-examples.json (atau alasan tidak executable).');
  const planText = readFileSync(planPath, 'utf8');
  const plan = executablePlanSchema.parse(JSON.parse(planText));
  if (plan.itemId !== item.id || plan.curriculumFingerprint !== item.fingerprint) {
    throw new Error('Executable plan identity stale.');
  }
  const proof = executeExamples(plan, resolve(directory, 'fixtures'));
  const pedigree = {
    unitId: item.id, curriculumFingerprint: item.fingerprint, pedagogy: lessonSpec.pedagogy,
  };
  const exportJson = (name: string, value: unknown) => {
    const content = JSON.stringify(value, null, 2) + '\n';
    writeFileSync(resolve(derivedDirectory, name), content);
    return sha256(content);
  };
  const pedagogyHash = exportJson('pedagogy-record.json', pedigree);
  const sourceHash = exportJson('source-pack.json', sourcePack);
  const proofHash = exportJson('example-proof.json', proof);
  const questionHash = sha256(readFileSync(resolve(derivedDirectory, 'review-bank.json'), 'utf8'));
  const receipt = {
    version: 3, itemId: item.id, curriculumFingerprint: item.fingerprint,
    hashes: {
      lesson: sha256(lesson),
      pedagogy: pedagogyHash,
      questionBank: questionHash,
      sourcePack: sourceHash,
      exampleProof: proofHash,
      examplePlan: sha256(planText),
    },
  };
  v3Hashes = {
    pedagogy: pedagogyHash,
    sourcePack: sourceHash,
    exampleProof: proofHash,
    examplePlan: sha256(planText),
    verifiedReceipt: exportJson('verified-receipt.json', receipt),
  };
}
writeFileSync(
  resolve(derivedDirectory, 'validation-report.json'),
  JSON.stringify({
    itemId,
    curriculumFingerprint: item.fingerprint,
    passed: true,
    artifactHashes: {
      lesson: sha256(lesson),
      sourcePack: sha256(readFileSync(sourcePackPath, 'utf8')),
      lessonSpec: sha256(readFileSync(specPath, 'utf8')),
      generationRecord: sha256(readFileSync(resolve(derivedDirectory, 'generation-record.json'), 'utf8')),
      reviewBank: sha256(readFileSync(resolve(derivedDirectory, 'review-bank.json'), 'utf8')),
      ...v3Hashes,
    },
    checks: [
      'curriculum-fingerprint',
      'source-pack',
      'criterion-coverage',
      'review-coverage',
      'lesson-frontmatter',
      'required-components',
      'prerequisite-links',
      'source-links',
      ...(lessonSpec.pedagogy ? ['pedagogical-scaffolding', 'verified-project-bridge'] : []),
      ...(lessonSpec.pedagogy?.version === 3 ? ['v3-canonical-artifact-imports', 'source-claim-ledger', 'executable-proof', 'receipt-hashes'] : []),
    ],
  }, null, 2) + '\n',
);

console.log('Generation bundle valid: ' + itemId);
console.log('Derived artifacts written to ' + derivedDirectory);
