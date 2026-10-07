import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { initialSchema } from '../../migrations/001-initial';
import { learningItemsMigration } from '../../migrations/002-learning-items';
import { reviewMigration } from '../../migrations/003-review';

export function openDatabase(path: string) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');

  let version = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  if (version > 3) {
    db.close();
    throw new Error('Database lebih baru dari versi aplikasi.');
  }

  if (version === 0) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(initialSchema);
      db.exec('COMMIT');
      version = 1;
    } catch (error) {
      db.exec('ROLLBACK');
      db.close();
      throw error;
    }
  }

  if (version === 1) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(learningItemsMigration);
      db.exec('COMMIT');
      version = 2;
    } catch (error) {
      db.exec('ROLLBACK');
      db.close();
      throw error;
    }
  }

  if (version === 2) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(reviewMigration);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      db.close();
      throw error;
    }
  }

  return db;
}
