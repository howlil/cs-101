-- Independent competency attempts; no changes to legacy completion.
CREATE TABLE competency_attempts (
 id TEXT PRIMARY KEY,
 request_id TEXT NOT NULL UNIQUE,
 item_id TEXT NOT NULL,
 competency_id TEXT NOT NULL,
 assessment_id TEXT NOT NULL,
 assessment_version TEXT NOT NULL,
 phase TEXT NOT NULL CHECK(phase IN ('practice','recall')),
 answer_index INTEGER NOT NULL,
 correct INTEGER NOT NULL CHECK(correct IN (0,1)),
 recorded_at TEXT NOT NULL
);
CREATE INDEX competency_attempts_progress_idx
 ON competency_attempts(item_id,phase,correct,recorded_at);
CREATE TABLE competency_review_schedule (
 competency_id TEXT PRIMARY KEY,
 step INTEGER NOT NULL DEFAULT 0,
 due_at TEXT NOT NULL
);
