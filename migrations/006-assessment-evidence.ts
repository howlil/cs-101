export const assessmentEvidenceMigration = `
ALTER TABLE competency_attempts ADD COLUMN outcome TEXT NOT NULL DEFAULT 'legacy_unknown';
ALTER TABLE competency_attempts ADD COLUMN bank_fingerprint TEXT;
CREATE INDEX competency_attempts_item_history_idx
  ON competency_attempts(item_id, assessment_id, recorded_at);
PRAGMA user_version = 6;
`;
