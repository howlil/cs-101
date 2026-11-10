#!/usr/bin/env bash
# SQL-019: live two-session PostgreSQL concurrency, no published ports.
set -euo pipefail
command -v docker >/dev/null || { echo "Docker CLI required" >&2; exit 2; }
command -v python3 >/dev/null || { echo "Python 3 required" >&2; exit 2; }
ROOT="$(cd "$(dirname "$BASH_SOURCE")/../.." && pwd)"
NAME="cs101-sql019-$RANDOM-$$"
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
if [ "$ready" -ne 1 ]; then
  echo "PostgreSQL final server not ready" >&2
  docker logs "$NAME" 2>&1 | tail -50 >&2
  exit 1
fi
python3 "$ROOT/labs/SQL-019/verify-concurrency.py" "$NAME"
