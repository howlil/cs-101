import { isDeepStrictEqual } from 'node:util';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { importEightDomainSnapshot } from './lib/eight-domain-import';

const input = JSON.parse(readFileSync(resolve('curriculum/source/engineering-2026-10-18.json'), 'utf8'));
const {manifest, report} = importEightDomainSnapshot(input);
const output = JSON.stringify(manifest, null, 2) + '\n';
const target = resolve('curriculum/manifest.v2.json');
if (process.argv.includes('--write')) {
  writeFileSync(target, output);
  writeFileSync(resolve('curriculum/import-report.json'), JSON.stringify(report,null,2) + '\n');
} else if (process.argv.includes('--check') &&
  !isDeepStrictEqual(JSON.parse(readFileSync(target,'utf8')),manifest)) {
  throw new Error('Imported manifest data drift. Run --write to regenerate and review the diff.');
}
console.log(JSON.stringify({mode:process.argv.slice(2), source:report.sourceSha256, counts:report.counts, warnings:report.warnings.slice(0,20)},null,2));