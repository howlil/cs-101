CREATE TABLE learner_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  active_task_id TEXT,
  revision INTEGER NOT NULL DEFAULT 0
);
INSERT INTO learner_state(id) VALUES(1);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  payload TEXT NOT NULL
);

CREATE TABLE task_progress (
  task_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('active', 'passed')),
  passed_fingerprint TEXT,
  last_anchor TEXT NOT NULL DEFAULT '',
  continue_from TEXT NOT NULL DEFAULT ''
);

CREATE TABLE request_receipts (
  request_id TEXT PRIMARY KEY,
  payload_hash TEXT NOT NULL,
  response TEXT NOT NULL,
  nonce TEXT NOT NULL
);
