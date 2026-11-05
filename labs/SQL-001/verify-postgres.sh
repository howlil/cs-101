#!/usr/bin/env bash
# SQL-001 PostgreSQL integration: local disposable container, no host port or external network.
set -euo pipefail
command -v docker >/dev/null || { echo "Docker CLI is required for the PostgreSQL integration test" >&2; exit 2; }
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INIT="$ROOT/labs/SQL-001/init.sql"
INSPECT="$ROOT/labs/SQL-001/inspect.sql"
NAME="cs101-sql001-${GITHUB_RUN_ID:-local}-$$"
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run --detach --rm --network none --name "$NAME" \
  -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine >/dev/null

ready=0
for _ in {1..90}; do
  if docker exec "$NAME" pg_isready -q -U postgres >/dev/null 2>&1; then ready=1; break; fi
  sleep 0.5
done
if [ "$ready" -ne 1 ]; then echo "PostgreSQL container never became ready" >&2; exit 1; fi
psql_file() {
  local db="$1" file="$2"
  docker exec -i "$NAME" psql -U postgres -d "$db" -X -q -A -t -v ON_ERROR_STOP=1 < "$file"
}
EXPECTED="$(printf '%s\n' \
  'schema=cs101_sql001' \
  'tables=accounts,transfers' \
  'accounts=2' \
  'transfers=2' \
  'foreign-keys=2' \
  'idr-total=155000.00')"
assert_six_queries() {
  local db="$1" actual
  actual="$(psql_file "$db" "$INSPECT")"
  if [ "$actual" != "$EXPECTED" ]; then
    printf 'SQL-001 query results mismatch for %s\nExpected:\n%s\nActual:\n%s\n' "$db" "$EXPECTED" "$actual" >&2
    return 1
  fi
}
psql_file postgres "$INIT" >/dev/null
assert_six_queries postgres
echo "sql001-six-queries=passed"

psql_file postgres "$INIT" >/dev/null
assert_six_queries postgres
echo "sql001-replay=passed"

docker exec "$NAME" createdb -U postgres sql001_fresh
psql_file sql001_fresh "$INIT" >/dev/null
assert_six_queries sql001_fresh
echo "sql001-fresh-database=passed"

# This insert must fail; no rejected row must survive the statement.
if docker exec -i "$NAME" psql -U postgres -d postgres -X -q -v ON_ERROR_STOP=1 > /dev/null 2>&1 <<'SQL'
INSERT INTO cs101_sql001.transfers
  (transfer_id,source_account_id,destination_account_id,amount,currency,created_at)
VALUES ('T-ORPHAN','A-99','A-01',1.00,'IDR','2026-01-10 11:00:00+00');
SQL
then
  echo "Orphan transfer unexpectedly accepted" >&2
  exit 1
fi
assert_six_queries postgres
echo "sql001-foreign-key=passed"
echo "sql001-postgres16=verified"
