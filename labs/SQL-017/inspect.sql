-- Run in an independent psql connection, not the transaction session.
\set ON_ERROR_STOP on
SELECT 'balances=' || string_agg(account_id || '=' || balance::text, ',' ORDER BY account_id)
FROM cs101_sql017.accounts;
SELECT 'ledger=' || COUNT(*)::text FROM cs101_sql017.ledger;
SELECT 'conserved=' || SUM(balance)::text FROM cs101_sql017.accounts;
