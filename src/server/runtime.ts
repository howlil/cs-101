import { getCollection } from 'astro:content';
import { resolve } from 'node:path';
import { curriculumGraph } from './curriculum';
import { LearningService } from './learning';
import { CloudflareLearningService, type D1Database } from './cloudflare-learning';
import { reviewBankFor } from './review-bank';

let service: LearningService | undefined;

export async function learning() {
  const lessons = await getCollection('lessons');
  const lessonReady = (itemId: string) => {
    const item = curriculumGraph.itemsById.get(itemId);
    if (!item || item.kind !== 'unit') return true;
    return lessons.some((lesson) =>
      !lesson.data.demo &&
      lesson.data.taskId === item.id &&
      lesson.data.curriculumFingerprint === item.fingerprint
    );
  };

  let database: D1Database | undefined;
  try {
    database = (await import('cloudflare:workers')).env.LEARNING_DB;
  } catch {}

  if (database) {
    return new CloudflareLearningService(database, curriculumGraph, lessonReady, reviewBankFor);
  }

  if (!service) {
    const { openDatabase } = await import('./storage');
    const db = openDatabase(resolve(process.env.CS101_DB_PATH ?? '.data/learning.sqlite'));
    service = new LearningService(db, curriculumGraph, lessonReady, reviewBankFor);
  }
  return service;
}
