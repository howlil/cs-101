#!/usr/bin/env bash
# Disposable real PostgreSQL 16 atomicity proof. No published ports, no production access.
set -euo pipefail
command -v docker >/dev/null || { echo "Docker is required" >&2; exit 2; }
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NAME="cs101-sql017-${GITHUB_RUN_ID:-local}-$$"
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run --detach --rm --network none --name "$NAME" \
  -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine >/dev/null
ready=0
for _ in {1..90}; do
  if docker logs "$NAME" 2>&1 | grep -F 'PostgreSQL init process complete; ready for start up.' >/dev/null; then
    if docker exec "$NAME" psql -U postgres -d postgres -X -At -v ON_ERROR_STOP=1 -c 'SELECT 1' 2>/dev/null | grep -qx '1'; then
      ready=1; break
    fi
  fi
  sleep 0.5
done
if [ "$ready" -ne 1 ]; then docker logs "$NAME" >&2; exit 1; fi
psql_file() {
  local db="$1" script="$2"
  docker exec -i "$NAME" psql -U postgres -d "$db" -X -q -A -t -v ON_ERROR_STOP=1 < "$ROOT/labs/SQL-017/$script"
}
expected_initial="$(printf '%s\n' 'balances=A-01=1000.00,A-02=200.00' 'ledger=0' 'conserved=1200.00')"
expected_committed="$(printf '%s\n' 'balances=A-01=875.00,A-02=325.00' 'ledger=1' 'conserved=1200.00')"
assert_state() {
  local db="$1" expected="$2" actual
  actual="$(psql_file "$db" inspect.sql)"
  if [ "$actual" != "$expected" ]; then
    printf 'SQL-017 persisted-state mismatch (%s)\nExpected:\n%s\nActual:\n%s\n' "$db" "$expected" "$actual" >&2
    exit 1
  fi
}
psql_file postgres init.sql >/dev/null
assert_state postgres "$expected_initial"
echo "sql017-seed=verified"

psql_file postgres commit.sql >/dev/null
assert_state postgres "$expected_committed"
echo "sql017-commit=atomic"

# Mutate only the source balance predicate of the SAME commit script.
# Without ROW_COUNT checks a zero-row debit could still credit and record
# TX-INSUFFICIENT, which would pass SQL constraints but create money.
if insufficient_error="$(
  sed -e 's/AND balance>=125.00/AND balance>=999999.00/' \
      -e 's/TX-SUCCESS/TX-INSUFFICIENT/' "$ROOT/labs/SQL-017/commit.sql" |
    docker exec -i "$NAME" psql -U postgres -d postgres -X -q -A -t -v ON_ERROR_STOP=1 2>&1
)"; then
  echo "Zero-row debit unexpectedly committed" >&2; exit 1
fi
if [[ "$insufficient_error" != *"Sender debit must update exactly one account"* ]]; then
  printf 'Wrong insufficient-funds failure: %s\n' "$insufficient_error" >&2
  exit 1
fi
assert_state postgres "$expected_committed"
echo "sql017-insufficient-funds=rejected"

# Mutate only the credit UPDATE target; ledger FK still points to A-02.
# Without ROW_COUNT checks the debit and ledger would incorrectly commit.
if missing_recipient_error="$(
  sed -e "s/WHERE account_id='A-02'/WHERE account_id='A-MISSING'/" \
      -e 's/TX-SUCCESS/TX-MISSING-DEST/' "$ROOT/labs/SQL-017/commit.sql" |
    docker exec -i "$NAME" psql -U postgres -d postgres -X -q -A -t -v ON_ERROR_STOP=1 2>&1
)"; then
  echo "Zero-row credit unexpectedly committed" >&2; exit 1
fi
if [[ "$missing_recipient_error" != *"Recipient credit must update exactly one account"* ]]; then
  printf 'Wrong missing-recipient failure: %s\n' "$missing_recipient_error" >&2
  exit 1
fi
assert_state postgres "$expected_committed"
echo "sql017-missing-recipient=rejected"

# The forced duplicate-PK failure must be a real database error.
# If BEGIN/COMMIT are accidentally removed, this check catches partial writes.
if psql_file postgres fail-before-commit.sql >/dev/null 2>&1; then
  echo "Expected ledger uniqueness failure was not observed" >&2; exit 1
fi
assert_state postgres "$expected_committed"
echo "sql017-forced-failure=rolled-back"

psql_file postgres explicit-rollback.sql >/dev/null
assert_state postgres "$expected_committed"
echo "sql017-explicit-rollback=verified"

docker exec "$NAME" createdb -U postgres sql017_fresh
psql_file sql017_fresh init.sql >/dev/null
assert_state sql017_fresh "$expected_initial"
psql_file sql017_fresh commit.sql >/dev/null
assert_state sql017_fresh "$expected_committed"
echo "sql017-fresh-database=verified"
echo "sql017-postgres16=verified"
