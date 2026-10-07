import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';

import manifestSource from '../curriculum/manifest.v2.json';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { requiredEvidenceForItem } from '../src/domain/learning/rules';

const graph = buildCurriculumGraph(manifestSource);
const recordSchema = z.object({
  taskId: z.string().optional(),
  itemId: z.string().optional(),
  fingerprint: z.string(),
  sources: z.array(z.object({
    title: z.string().min(1),
    url: z.url().refine((url) => /^https?:/.test(url)),
  })).min(1),
  coverage: z.array(z.object({
    criterionId: z.string(),
    taughtAt: z.string().min(1),
    assessedAt: z.string().min(1),
    evidenceExpected: z.string().min(1),
  })),
  validator: z.object({ passed: z.literal(true) }),
});

const found = new Set<string>();
let demos = 0;

for (const file of readdirSync('src/content/lessons', { recursive: true, withFileTypes: true })) {
  if (!file.isFile() || !file.name.endsWith('.mdx')) continue;
  const path = join(file.parentPath, file.name);
  const content = readFileSync(path, 'utf8');
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) throw new Error(`Frontmatter missing: ${path}`);

  const data = parse(frontmatter[1]);
  if (data.demo === true) {
    demos++;
    continue;
  }

  const item = graph.itemsById.get(data.taskId);
  if (!item) throw new Error(`Item tidak dikenal: ${path}`);
  if (item.kind !== 'unit') throw new Error(`Lesson MDX hanya untuk unit: ${item.id}`);
  if (found.has(item.id)) throw new Error(`Lesson duplikat: ${item.id}`);
  found.add(item.id);

  if (data.curriculumFingerprint !== item.fingerprint) {
    throw new Error(`Lesson stale: ${item.id}`);
  }

  const recordPath = resolve('generation', `${item.id}.json`);
  if (!existsSync(recordPath)) throw new Error(`Metadata belum tersedia: ${item.id}`);
  const record = recordSchema.parse(JSON.parse(readFileSync(recordPath, 'utf8')));
  const recordId = record.itemId ?? record.taskId;
  if (recordId !== item.id || record.fingerprint !== item.fingerprint) {
    throw new Error(`Metadata stale: ${item.id}`);
  }

  for (const criterion of requiredEvidenceForItem(item)) {
    if (!record.coverage.some((entry) => entry.criterionId === criterion.id)) {
      throw new Error(`Coverage hilang: ${item.id}/${criterion.id}`);
    }
  }

  for (const match of content.matchAll(/\/learn\/([A-Z]+-(?:P\d{2,3}|\d{3}))/g)) {
    const linked = graph.itemsById.get(match[1]);
    if (!linked) throw new Error(`Link item tidak dikenal: ${match[1]}`);
    if (linked.kind !== 'unit') {
      throw new Error(`Link /learn hanya boleh menuju unit: ${match[1]}`);
    }
  }
}

const unitCount = graph.manifest.items.filter((item) => item.kind === 'unit').length;
console.log(
  `Content: ${unitCount} unit curriculum, ${found.size} lesson curriculum, ${demos} demo.`,
);
console.log('Schema dan metadata diperiksa. Kualitas materi dan sumber tetap membutuhkan review.');
