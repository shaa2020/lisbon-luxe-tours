#!/usr/bin/env bash
# Recreate the local/CI test database and apply the Supabase shim + all migrations.
# Usage: DATABASE_URL=postgres://postgres@127.0.0.1:54329/postgres scripts/db-reset.sh
set -euo pipefail
ADMIN_URL="${DATABASE_ADMIN_URL:-postgres://postgres@127.0.0.1:54329/postgres}"
DB_NAME="${TEST_DB_NAME:-shiftpilot_test}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -q -c "drop database if exists ${DB_NAME} with (force);" -c "create database ${DB_NAME};"
DB_URL="${ADMIN_URL%/*}/${DB_NAME}"

psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/test-support/supabase_shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "applying $(basename "$f")"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -q -o /dev/null -f "$f"
done
echo "Database ${DB_NAME} ready: ${DB_URL}"
