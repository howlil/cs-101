-- Disposable PostgreSQL 16 educational transfer schema; no production or bank records.
CREATE TABLE transfers (
  transfer_id text PRIMARY KEY,
  client_reference text NOT NULL UNIQUE,
  source_account_id text NOT NULL,
  destination_account_id text NOT NULL,
  amount text NOT NULL CHECK (amount ~ '^[1-9][0-9]*(\.[0-9]{1,2})?$'),
  currency text NOT NULL CHECK (currency IN ('IDR', 'USD')),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','COMPLETED','REJECTED')),
  provider_outcome text NOT NULL DEFAULT 'NOT_SENT' CHECK (provider_outcome IN ('NOT_SENT','ACCEPTED','UNKNOWN','REJECTED')),
  provider_reference text,
  created_at timestamptz NOT NULL DEFAULT TIMESTAMPTZ '2026-11-07 00:00:00+00'
);
