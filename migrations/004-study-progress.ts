export const studyProgressMigration = `
  CREATE TABLE item_study (
    item_id TEXT PRIMARY KEY,
    studied_at TEXT NOT NULL
  );
  PRAGMA user_version = 4;
`;
