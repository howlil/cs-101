-- Three writes in one transaction: debit, credit, ledger.
\set ON_ERROR_STOP on
BEGIN;
UPDATE cs101_sql017.accounts SET balance=balance-125.00
  WHERE account_id='A-01' AND balance>=125.00;
UPDATE cs101_sql017.accounts SET balance=balance+125.00
  WHERE account_id='A-02';
INSERT INTO cs101_sql017.ledger(transfer_id,source_id,destination_id,amount)
  VALUES('TX-SUCCESS','A-01','A-02',125.00);
COMMIT;
