import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parse } from 'yaml';

import manifestSource from '../curriculum/manifest.v2.json';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';

const itemId = process.argv[2];
if (!itemId) throw new Error('Gunakan: pnpm generation:promote <ITEM-ID>');

const graph = buildCurriculumGraph(manifestSource);
const item = graph.itemsById.get(itemId);
if (!item || item.kind !== 'unit') throw new Error('Unit tidak ditemukan: ' + itemId);

const staging = resolve('generation', 'staging', itemId);
const lesson = resolve(staging, 'lesson.mdx');
const record = resolve(staging, 'derived', 'generation-record.json');
const review = resolve(staging, 'derived', 'review-bank.json');
const report = resolve(staging, 'derived', 'validation-report.json');

for (const path of [lesson, record, review, report]) {
  if (!existsSync(path)) throw new Error('Jalankan generation:validate dulu. Artifact hilang: ' + path);
}

const validation = JSON.parse(readFileSync(report, 'utf8')) as {
  itemId?: string;
  curriculumFingerprint?: string;
  passed?: boolean;
};
if (
  validation.passed !== true ||
  validation.itemId !== item.id ||
  validation.curriculumFingerprint !== item.fingerprint
) {
  throw new Error('Validation report tidak cocok dengan curriculum aktif.');
}

const lessonText = readFileSync(lesson, 'utf8');
const frontmatter = lessonText.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!frontmatter) throw new Error('Lesson frontmatter hilang.');
const data = parse(frontmatter[1]) as Record<string, unknown>;
if (data.curriculumFingerprint !== item.fingerprint) {
  throw new Error('Lesson berubah setelah validation.');
}

const lessonDestination = resolve('src', 'content', 'lessons', item.trackId, item.id + '.mdx');
const recordDestination = resolve('generation', item.id + '.json');
const reviewDestination = resolve('review-banks', item.id + '.json');

mkdirSync(dirname(lessonDestination), { recursive: true });
copyFileSync(lesson, lessonDestination);
copyFileSync(record, recordDestination);
copyFileSync(review, reviewDestination);

console.log('Promoted: ' + item.id);
console.log('- ' + lessonDestination);
console.log('- ' + recordDestination);
console.log('- ' + reviewDestination);
console.log('Run pnpm validate:content && pnpm validate:reviews before commit.');
