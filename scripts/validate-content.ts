import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import { fingerprint, parseManifest, requiredEvidence } from '../src/domain/curriculum';

const manifest = parseManifest(JSON.parse(readFileSync('curriculum/manifest.json', 'utf8')));
const recordSchema = z.object({
  taskId: z.string(),
  fingerprint: z.string(),
  sources: z.array(z.object({ title: z.string().min(1), url: z.url().refine((url) => /^https?:/.test(url)) })).min(1),
  coverage: z.array(z.object({ criterionId: z.string(), taughtAt: z.string().min(1), assessedAt: z.string().min(1), evidenceExpected: z.string().min(1) })),
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
  if (data.demo === true) { demos++; continue; }
  const task = manifest.tasks.find((task) => task.taskId === data.taskId);
  if (!task) throw new Error(`Task tidak dikenal: ${path}`);
  if (found.has(task.taskId)) throw new Error(`Lesson duplikat: ${task.taskId}`);
  found.add(task.taskId);
  if (data.curriculumFingerprint !== fingerprint(task)) throw new Error(`Lesson stale: ${task.taskId}`);
  const recordPath = resolve('generation', `${task.taskId}.json`);
  if (!existsSync(recordPath)) throw new Error(`Metadata belum tersedia: ${task.taskId}`);
  const record = recordSchema.parse(JSON.parse(readFileSync(recordPath, 'utf8')));
  if (record.taskId !== task.taskId || record.fingerprint !== fingerprint(task)) throw new Error(`Metadata stale: ${task.taskId}`);
  for (const criterion of requiredEvidence(task)) {
    if (!record.coverage.some((entry) => entry.criterionId === criterion.id)) throw new Error(`Coverage hilang: ${task.taskId}/${criterion.id}`);
  }
  for (const match of content.matchAll(/\/learn\/([A-Z]+-(?:P\d{2,3}|\d{3}))/g)) {
    if (!manifest.tasks.some((task) => task.taskId === match[1])) throw new Error(`Link task tidak dikenal: ${match[1]}`);
  }
}
console.log(`Content: ${manifest.tasks.length} task, ${found.size} lesson curriculum, ${demos} demo.`);
console.log('Schema dan metadata diperiksa. Kualitas materi dan sumber tetap membutuhkan review.');
