import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { initialSchema } from '../../migrations/001-initial';

export function openDatabase(path: string) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');
  const version = db.prepare('PRAGMA user_version').get() as { user_version: number };
  if (version.user_version > 1) {
    db.close();
    throw new Error('Database lebih baru dari versi aplikasi.');
  }
  if (version.user_version === 0) {
    db.exec('BEGIN IMMEDIATE');
    try { db.exec(initialSchema); db.exec('COMMIT'); }
    catch (error) { db.exec('ROLLBACK'); db.close(); throw error; }
  }
  return db;
}
