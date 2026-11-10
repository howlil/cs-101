-- Successful statements followed by an intentional transaction cancellation.
\set ON_ERROR_STOP on
BEGIN;
UPDATE cs101_sql017.accounts SET balance=balance-40.00
  WHERE account_id='A-01' AND balance>=40.00;
UPDATE cs101_sql017.accounts SET balance=balance+40.00
  WHERE account_id='A-02';
INSERT INTO cs101_sql017.ledger(transfer_id,source_id,destination_id,amount)
  VALUES('TX-CANCEL','A-01','A-02',40.00);
ROLLBACK;
