import { getCollection } from 'astro:content';
import { resolve } from 'node:path';
import { fingerprint } from '../domain/curriculum';
import { tasks } from './curriculum';
import { openDatabase } from './storage';
import { LearningService } from './learning';

let service: LearningService | undefined;
export async function learning() {
  if (!service) {
    const lessons = await getCollection('lessons');
    const db = openDatabase(resolve(process.env.CS101_DB_PATH ?? '.data/learning.sqlite'));
    service = new LearningService(db, tasks, (task) => lessons.some((lesson) =>
      !lesson.data.demo && lesson.data.taskId === task.taskId && lesson.data.curriculumFingerprint === fingerprint(task)));
  }
  return service;
}
