-- Forced uniqueness error after both balances changed, but before COMMIT.
-- ON_ERROR_STOP closes psql session on error, causing PostgreSQL to abort.
\set ON_ERROR_STOP on
BEGIN;
UPDATE cs101_sql017.accounts SET balance=balance-30.00
  WHERE account_id='A-01' AND balance>=30.00;
UPDATE cs101_sql017.accounts SET balance=balance+30.00
  WHERE account_id='A-02';
INSERT INTO cs101_sql017.ledger(transfer_id,source_id,destination_id,amount)
  VALUES('TX-SUCCESS','A-01','A-02',30.00);
COMMIT;
