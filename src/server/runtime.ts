import { resolve } from 'node:path';
import { curriculumGraph } from './curriculum';
import { LearningService } from './learning/sqlite';
import { CloudflareLearningService, type D1Database } from './learning/d1';
import { reviewBankFor } from './review-bank';

let service: LearningService | undefined;

export async function learning() {
  let database: D1Database | undefined;
  try {
    database = (await import('cloudflare:workers')).env.LEARNING_DB;
  } catch {}

  if (database) {
    return new CloudflareLearningService(database, curriculumGraph, reviewBankFor);
  }

  if (!service) {
    const { openDatabase } = await import('./storage');
    const db = openDatabase(resolve(process.env.CS101_DB_PATH ?? '.data/learning.sqlite'));
    service = new LearningService(db, curriculumGraph, reviewBankFor);
  }
  return service;
}
