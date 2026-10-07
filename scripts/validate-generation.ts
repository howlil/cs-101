import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

import manifestSource from '../curriculum/manifest.v2.json';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { validateGenerationPlan, buildGenerationRecord, buildReviewBank } from '../src/domain/generation/validate';

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

const lesson = readFileSync(lessonPath, 'utf8');
const frontmatter = lesson.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!frontmatter) throw new Error('lesson.mdx tidak punya frontmatter.');

const data = parse(frontmatter[1]) as Record<string, unknown>;
if (data.taskId !== item.id && data.id !== item.id) {
  throw new Error('Lesson frontmatter menunjuk item yang berbeda.');
}
if (data.curriculumFingerprint !== item.fingerprint) {
  throw new Error('Lesson frontmatter stale.');
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
  JSON.stringify(buildReviewBank(sourcePack, lessonSpec), null, 2) + '\n',
);
writeFileSync(
  resolve(derivedDirectory, 'validation-report.json'),
  JSON.stringify({
    itemId,
    curriculumFingerprint: item.fingerprint,
    passed: true,
    checks: [
      'curriculum-fingerprint',
      'source-pack',
      'criterion-coverage',
      'review-coverage',
      'lesson-frontmatter',
      'required-components',
      'prerequisite-links',
      'source-links',
    ],
  }, null, 2) + '\n',
);

console.log('Generation bundle valid: ' + itemId);
console.log('Derived artifacts written to ' + derivedDirectory);
