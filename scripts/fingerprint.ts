import { readFileSync } from 'node:fs';
import { fingerprint, parseManifest } from '../src/domain/curriculum';
const manifest = parseManifest(JSON.parse(readFileSync('curriculum/manifest.json', 'utf8')));
const task = manifest.tasks.find((task) => task.taskId === process.argv[2]);
if (!task) throw new Error('Gunakan: pnpm exec tsx scripts/fingerprint.ts <TASK-ID>');
console.log(fingerprint(task));
