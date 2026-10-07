ALTER TABLE learner_state ADD COLUMN active_item_id TEXT;
UPDATE learner_state SET active_item_id = active_task_id WHERE active_item_id IS NULL;

CREATE TABLE item_progress (
  item_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('active', 'passed')),
  passed_fingerprint TEXT,
  last_anchor TEXT NOT NULL DEFAULT '',
  continue_from TEXT NOT NULL DEFAULT ''
);

INSERT INTO item_progress(item_id, status, passed_fingerprint, last_anchor, continue_from)
SELECT task_id, status, passed_fingerprint, last_anchor, continue_from
FROM task_progress
ON CONFLICT(item_id) DO NOTHING;

ALTER TABLE sessions ADD COLUMN item_id TEXT;
UPDATE sessions SET item_id = task_id WHERE item_id IS NULL;
