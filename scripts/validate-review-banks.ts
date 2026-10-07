import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import manifestSource from '../curriculum/manifest.v2.json';
import { buildCurriculumGraph } from '../src/domain/curriculum-v2/graph';
import { requiredEvidenceForItem } from '../src/domain/learning/rules';
import { reviewBankSchema } from '../src/domain/review/schema';

const graph = buildCurriculumGraph(manifestSource);
const root = 'review-banks';
const seen = new Set<string>();
let count = 0;

if (existsSync(root)) {
  for (const file of readdirSync(root)) {
    if (!file.endsWith('.json')) continue;
    const path = join(root, file);
    const bank = reviewBankSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
    if (seen.has(bank.itemId)) throw new Error('Review bank duplikat: ' + bank.itemId);
    seen.add(bank.itemId);

    const item = graph.itemsById.get(bank.itemId);
    if (!item) throw new Error('Review bank item tidak dikenal: ' + bank.itemId);
    if (bank.curriculumFingerprint !== item.fingerprint) {
      throw new Error('Review bank stale: ' + bank.itemId);
    }

    const allowedCriteria = new Set(requiredEvidenceForItem(item).map((criterion) => criterion.id));
    const questionIds = new Set<string>();
    for (const question of bank.questions) {
      if (questionIds.has(question.id)) throw new Error('Review question ID duplikat: ' + bank.itemId + '/' + question.id);
      questionIds.add(question.id);
      for (const criterionId of question.criterionIds) {
        if (!allowedCriteria.has(criterionId)) {
          throw new Error('Review criterion tidak dikenal: ' + bank.itemId + '/' + criterionId);
        }
      }
    }
    count += 1;
  }
}

console.log('Review banks: ' + count + ' valid.');
