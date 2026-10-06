import { getCollection } from 'astro:content';
import { resolve } from 'node:path';
import { fingerprint } from '../domain/curriculum';
import { tasks } from './curriculum';
import { LearningService } from './learning';
import { CloudflareLearningService, type D1Database } from './cloudflare-learning';

let service: LearningService | undefined;

export async function learning() {
  const lessons = await getCollection('lessons');
  const lessonReady = (task: (typeof tasks)[number]) => lessons.some((lesson) =>
    !lesson.data.demo && lesson.data.taskId === task.taskId && lesson.data.curriculumFingerprint === fingerprint(task));
  let database: D1Database | undefined;
  try { database = (await import('cloudflare:workers')).env.LEARNING_DB; } catch {}
  if (database) return new CloudflareLearningService(database, tasks, lessonReady);

  if (!service) {
    const { openDatabase } = await import('./storage');
    const db = openDatabase(resolve(process.env.CS101_DB_PATH ?? '.data/learning.sqlite'));
    service = new LearningService(db, tasks, lessonReady);
  }
  return service;
}
