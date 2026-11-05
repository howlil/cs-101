-- Exactly six inspection SELECT queries; execute with psql -X -q -At -v ON_ERROR_STOP=1.
\set ON_ERROR_STOP on
SET search_path TO cs101_sql001, pg_catalog;
SELECT 'schema=' || current_schema();
SELECT 'tables=' || string_agg(tablename, ',' ORDER BY tablename)
  FROM pg_catalog.pg_tables WHERE schemaname = 'cs101_sql001';
SELECT 'accounts=' || count(*) FROM accounts;
SELECT 'transfers=' || count(*) FROM transfers;
SELECT 'foreign-keys=' || count(*)
  FROM information_schema.table_constraints
  WHERE table_schema = 'cs101_sql001' AND constraint_type = 'FOREIGN KEY';
SELECT 'idr-total=' || coalesce(sum(amount), 0)::numeric(12,2)
  FROM transfers WHERE currency = 'IDR';
