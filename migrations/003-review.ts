export const reviewMigration = `
  CREATE TABLE review_schedule (
    item_id TEXT PRIMARY KEY,
    policy_version TEXT NOT NULL,
    step INTEGER NOT NULL DEFAULT 0,
    due_at TEXT,
    state TEXT NOT NULL CHECK(state IN ('scheduled', 'retry', 'retained'))
  );

  CREATE TABLE review_attempts (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    question_set_version TEXT NOT NULL,
    answers TEXT NOT NULL,
    grading_mode TEXT NOT NULL,
    score INTEGER NOT NULL,
    assisted INTEGER NOT NULL CHECK(assisted IN (0, 1)),
    result TEXT NOT NULL CHECK(result IN ('passed', 'again')),
    recorded_at TEXT NOT NULL
  );

  CREATE INDEX review_attempts_item_recorded_idx
    ON review_attempts(item_id, recorded_at);

  PRAGMA user_version = 3;
`;
