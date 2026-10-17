import { readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildManifestFromWorkbook,workbookSha256 } from './lib/curriculum-import';
import { readXlsxWorkbook } from './lib/xlsx-lite';
import type { CurriculumManifestV2 } from '../src/domain/curriculum-v2/schema';

const dryRun = process.argv.includes('--dry-run');
const filename = process.argv.slice(2).find((arg) => !arg.startsWith('--')) ?? 'curriculum/raw/kurikulum.xlsx';
const input = resolve(filename);
const bytes = readFileSync(input);
const workbook = readXlsxWorkbook(input);
const { manifest, report } = buildManifestFromWorkbook(workbook, workbookSha256(bytes));

if (dryRun) {
  const current = JSON.parse(readFileSync('curriculum/manifest.v2.json', 'utf8')) as CurriculumManifestV2;
  const existing = new Map(current.items.map((item) => [item.id, item]));
  const proposed = new Map(manifest.items.map((item) => [item.id, item]));
  const added = manifest.items.filter((item) => !existing.has(item.id)).map((item) => item.id);
  const removed = current.items.filter((item) => !proposed.has(item.id)).map((item) => item.id);
  const changed = manifest.items.filter((item) =>
    existing.has(item.id) && existing.get(item.id)?.fingerprint !== item.fingerprint
  ).map((item) => item.id);
  console.log(JSON.stringify({
    dryRun: true, writes: false,
    existing: {tracks: current.tracks.length, items: current.items.length},
    proposed: report.counts,
    added, removed, changed,
    warningCount: report.counts.warnings,
    sourceSha256: report.sourceSha256,
  }, null, 2));
  process.exit(0);
}

writeFileSync(resolve('curriculum/manifest.v2.json'), JSON.stringify(manifest,null,2)+'\n');
writeFileSync(resolve('curriculum/import-report.json'), JSON.stringify(report,null,2)+'\n');
console.log('Curriculum V2: '+report.counts.items+' item ('+report.counts.units+' unit, '+report.counts.checkpoints+' checkpoint, '+report.counts.integrations+' integration).');
console.log('Track/module: '+report.counts.tracks+'/'+report.counts.modules+'. Relation: '+report.counts.relations+'. Warning: '+report.counts.warnings+'.');
