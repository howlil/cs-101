#!/usr/bin/env bash
# Real service and PostgreSQL 16 on a Docker internal network, with a local-only bank stub.
set -euo pipefail
command -v docker >/dev/null || { echo "Docker daemon required" >&2; exit 2; }
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LAB="$ROOT/labs/TST-024"
TAG="cs101-tst024-$$"
NET="$TAG-network"
DB="$TAG-db"
BANK="$TAG-bank"
SERVICE="$TAG-service"
cleanup() {
 docker rm -f -v "$SERVICE" "$BANK" "$DB" >/dev/null 2>&1 || true
 docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT
# Install isolated Node postgres client before creating the internal network.
npm install --prefix "$LAB" --no-audit --no-fund --package-lock=false
docker network create --driver bridge --internal "$NET" >/dev/null
test "$(docker network inspect --format '{{.Internal}}' "$NET")" = true
echo "service-boundary-network=internal"
docker run --detach --rm --name "$DB" --network "$NET" --network-alias db \
 -e POSTGRES_PASSWORD=local-test-only -e POSTGRES_DB=cs101 postgres:16-alpine >/dev/null
ready=0
for _ in {1..90}; do
 if docker logs "$DB" 2>&1 | grep -F 'PostgreSQL init process complete; ready for start up.' >/dev/null; then
  if docker exec "$DB" psql -U postgres -d cs101 -X -A -t -v ON_ERROR_STOP=1 -c 'SELECT 1' 2>/dev/null | grep -qx 1; then
   ready=1
   break
  fi
 fi
 sleep 0.5
done
if [ "$ready" -ne 1 ]; then
 echo "PostgreSQL 16 not ready" >&2
 docker logs "$DB" 2>&1 | tail -40 >&2
 exit 1
fi
docker exec -i "$DB" psql -U postgres -d cs101 -X -q -v ON_ERROR_STOP=1 < "$LAB/schema.sql"
docker run --detach --rm --name "$BANK" --network "$NET" --network-alias bank \
 --mount "type=bind,src=$LAB,dst=/lab,readonly" --workdir /lab \
 node:24-alpine node bank.mjs >/dev/null
docker run --detach --rm --name "$SERVICE" --network "$NET" --network-alias service \
 -e PGHOST=db -e PGPASSWORD=local-test-only -e BANK_BASE_URL=http://bank:4081 \
 --mount "type=bind,src=$LAB,dst=/lab,readonly" --workdir /lab \
 node:24-alpine node service.mjs >/dev/null
docker run --rm --network "$NET" --mount "type=bind,src=$LAB,dst=/lab,readonly" \
 --workdir /lab node:24-alpine node verify.mjs
actual="$(docker exec "$DB" psql -U postgres -d cs101 -X -A -t -v ON_ERROR_STOP=1 \
 -c "SELECT client_reference || '|' || status || '|' || provider_outcome || '|' || COALESCE(provider_reference,'none') FROM transfers ORDER BY client_reference")"
expected="$(printf '%s\n' \
 'client-success-001|PENDING|ACCEPTED|bank-success-001' \
 'client-timeout-001|PENDING|UNKNOWN|none')"
if [ "$actual" != "$expected" ]; then
 printf 'Persisted outcomes mismatch\nExpected:\n%s\nActual:\n%s\n' "$expected" "$actual" >&2
 exit 1
fi
count="$(docker exec "$DB" psql -U postgres -d cs101 -X -A -t -v ON_ERROR_STOP=1 -c 'SELECT count(*) FROM transfers')"
test "$count" = 2
for name in "$DB" "$BANK" "$SERVICE"; do
 test -z "$(docker port "$name" 2>/dev/null)"
done
echo "published-ports=0"
echo "production-bank-requests=0"
echo "tst024-postgres16=verified"
