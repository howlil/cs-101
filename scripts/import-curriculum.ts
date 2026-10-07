import { readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildManifestFromWorkbook,workbookSha256 } from './lib/curriculum-import';
import { readXlsxWorkbook } from './lib/xlsx-lite';
const input=resolve(process.argv[2]??'curriculum/raw/kurikulum.xlsx'),bytes=readFileSync(input),workbook=readXlsxWorkbook(input),{manifest,report}=buildManifestFromWorkbook(workbook,workbookSha256(bytes));
writeFileSync(resolve('curriculum/manifest.v2.json'),JSON.stringify(manifest,null,2)+'\n');writeFileSync(resolve('curriculum/import-report.json'),JSON.stringify(report,null,2)+'\n');
console.log('Curriculum V2: '+report.counts.items+' item ('+report.counts.units+' unit, '+report.counts.checkpoints+' checkpoint, '+report.counts.integrations+' integration).');
console.log('Track/module: '+report.counts.tracks+'/'+report.counts.modules+'. Relation: '+report.counts.relations+'. Warning: '+report.counts.warnings+'.');
