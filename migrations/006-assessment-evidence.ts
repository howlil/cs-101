export const assessmentEvidenceMigration = `
-- Rebuild CHECK constraint to support transfer, preserving all v5 attempts.
CREATE TABLE competency_attempts_v6 (
 id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, item_id TEXT NOT NULL,
 competency_id TEXT NOT NULL, assessment_id TEXT NOT NULL, assessment_version TEXT NOT NULL,
 phase TEXT NOT NULL CHECK(phase IN ('practice','transfer','recall')),
 answer_index INTEGER NOT NULL, correct INTEGER NOT NULL CHECK(correct IN (0,1)),
 recorded_at TEXT NOT NULL, outcome TEXT NOT NULL DEFAULT 'legacy_unknown',
 bank_fingerprint TEXT
);
INSERT INTO competency_attempts_v6
(id,request_id,item_id,competency_id,assessment_id,assessment_version,phase,answer_index,correct,recorded_at,outcome,bank_fingerprint)
SELECT id,request_id,item_id,competency_id,assessment_id,assessment_version,phase,answer_index,correct,recorded_at,
 'legacy_unknown', NULL FROM competency_attempts;
DROP TABLE competency_attempts;
ALTER TABLE competency_attempts_v6 RENAME TO competency_attempts;
CREATE INDEX competency_attempts_progress_idx ON competency_attempts(item_id,phase,correct,recorded_at);
CREATE INDEX competency_attempts_item_history_idx ON competency_attempts(item_id,assessment_id,recorded_at);
PRAGMA user_version = 6;
`;
