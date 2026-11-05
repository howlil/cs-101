-- SQL-001 sandbox only: PostgreSQL 16; never execute against production.
\set ON_ERROR_STOP on
BEGIN;
CREATE SCHEMA IF NOT EXISTS cs101_sql001;
SET LOCAL search_path TO cs101_sql001, pg_catalog;
CREATE TABLE IF NOT EXISTS accounts (
  account_id TEXT PRIMARY KEY,
  owner_label TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS transfers (
  transfer_id TEXT PRIMARY KEY,
  source_account_id TEXT NOT NULL REFERENCES accounts(account_id),
  destination_account_id TEXT NOT NULL REFERENCES accounts(account_id),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
INSERT INTO accounts (account_id, owner_label) VALUES
  ('A-01', 'Sandbox Alice'),
  ('A-02', 'Sandbox Bob')
ON CONFLICT (account_id) DO NOTHING;
INSERT INTO transfers (
  transfer_id, source_account_id, destination_account_id, amount, currency, created_at
) VALUES
  ('T-100', 'A-01', 'A-02', 125000.00, 'IDR', '2026-01-10 09:00:00+00'),
  ('T-101', 'A-02', 'A-01', 30000.00, 'IDR', '2026-01-10 10:00:00+00')
ON CONFLICT (transfer_id) DO NOTHING;
COMMIT;
