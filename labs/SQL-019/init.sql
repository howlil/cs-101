-- SQL-019 disposable PostgreSQL 16 fixture. Fresh database only.
\set ON_ERROR_STOP on
BEGIN;
CREATE SCHEMA cs101_sql019;
CREATE TABLE cs101_sql019.accounts (
  account_id TEXT PRIMARY KEY,
  balance NUMERIC(14,2) NOT NULL CHECK (balance >= 0)
);
CREATE TABLE cs101_sql019.withdrawals (
  withdrawal_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES cs101_sql019.accounts(account_id),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0)
);
CREATE TABLE cs101_sql019.transfers (
  transfer_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES cs101_sql019.accounts(account_id),
  destination_id TEXT NOT NULL REFERENCES cs101_sql019.accounts(account_id),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  CHECK (source_id <> destination_id)
);
INSERT INTO cs101_sql019.accounts(account_id,balance)
VALUES ('W-01',100.00),('A-01',100.00),('A-02',100.00);
COMMIT;
