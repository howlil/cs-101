-- SQL-017: sandbox fixture, PostgreSQL 16. Run only in a disposable database.
\set ON_ERROR_STOP on
BEGIN;
CREATE SCHEMA cs101_sql017;
CREATE TABLE cs101_sql017.accounts (
  account_id TEXT PRIMARY KEY,
  balance NUMERIC(14,2) NOT NULL CHECK (balance >= 0)
);
CREATE TABLE cs101_sql017.ledger (
  transfer_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES cs101_sql017.accounts(account_id),
  destination_id TEXT NOT NULL REFERENCES cs101_sql017.accounts(account_id),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  CHECK (source_id <> destination_id)
);
INSERT INTO cs101_sql017.accounts(account_id,balance) VALUES
 ('A-01',1000.00),('A-02',200.00);
COMMIT;
