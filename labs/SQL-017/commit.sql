-- Three writes in one transaction: debit, credit, ledger.
-- Both balance updates must each change exactly one row; a zero-row UPDATE is
-- not a SQL error and would otherwise permit an invalid transfer to COMMIT.
\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE
  changed_rows BIGINT;
BEGIN
  UPDATE cs101_sql017.accounts SET balance=balance-125.00
    WHERE account_id='A-01' AND balance>=125.00;
  GET DIAGNOSTICS changed_rows = ROW_COUNT;
  IF changed_rows <> 1 THEN
    RAISE EXCEPTION 'Sender debit must update exactly one account';
  END IF;

  UPDATE cs101_sql017.accounts SET balance=balance+125.00
    WHERE account_id='A-02';
  GET DIAGNOSTICS changed_rows = ROW_COUNT;
  IF changed_rows <> 1 THEN
    RAISE EXCEPTION 'Recipient credit must update exactly one account';
  END IF;
END
$$;
INSERT INTO cs101_sql017.ledger(transfer_id,source_id,destination_id,amount)
  VALUES('TX-SUCCESS','A-01','A-02',125.00);
COMMIT;
