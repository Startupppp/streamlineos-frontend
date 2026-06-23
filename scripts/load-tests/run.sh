#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export BASE_URL="${BASE_URL:-http://localhost:1000}"
export SESSION_COOKIE
SESSION_COOKIE="$(pnpm exec tsx --env-file=.env scripts/load-tests/get-session.ts)"

if [[ -z "$SESSION_COOKIE" ]]; then
  echo "Failed to obtain session cookie." >&2
  exit 1
fi

export LOAD_TEST_SECRET="${LOAD_TEST_SECRET:-}"

exec k6 run "$@"
