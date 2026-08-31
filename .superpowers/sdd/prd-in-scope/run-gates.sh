#!/usr/bin/env bash
# Baseline gate sweep. Writes one line per gate to gates.tsv and full logs to logs/.
set -u
ROOT="D:/projects/personal/Streamlineos"
WS="$ROOT/.superpowers/sdd/prd-in-scope"
mkdir -p "$WS/logs"
OUT="$WS/gates.tsv"
: > "$OUT"

run() {
  local name="$1"; shift
  local dir="$1"; shift
  local log="$WS/logs/$name.log"
  ( cd "$dir" && eval "$@" ) > "$log" 2>&1
  local code=$?
  local tail_line
  tail_line=$(grep -aE "FAIL|✖|✗|ERROR|error|missing|uncovered|gaps|Gaps|coverage|[0-9]+/[0-9]+" "$log" | tail -3 | tr '\n' ' | ' | cut -c1-400)
  printf '%s\t%s\t%s\n' "$name" "$code" "$tail_line" >> "$OUT"
  echo "[$name] exit=$code"
}

BE="$ROOT/backend"
FE="$ROOT/frontend"

run be-typecheck        "$BE" 'pnpm typecheck'
run be-route-class      "$BE" 'pnpm check:route-classification'
run be-perm-keys        "$BE" 'pnpm check:permission-keys'
run be-nav-perms        "$BE" 'pnpm check:navigation-permissions'
run be-tenant-indexes   "$BE" 'pnpm check:tenant-indexes'
run be-scope-app        "$BE" 'pnpm check:scope-application'
run be-record-access    "$BE" 'pnpm check:record-access'
run be-module-entitle   "$BE" 'pnpm check:module-entitlement'
run be-module-lifecycle "$BE" 'pnpm check:module-lifecycle'
run be-idempotent       "$BE" 'pnpm check:idempotent-commands'
run be-tenant-isolation "$BE" 'pnpm check:tenant-isolation'
run be-log-secrets      "$BE" 'pnpm check:log-secrets'
run be-placement        "$BE" 'pnpm check:placement-bypass'
run be-owner-authority  "$BE" 'pnpm check:owner-authority'
run be-legacy-actors    "$BE" 'pnpm scan:legacy-actors:check'
run be-migration-chain  "$BE" 'pnpm check:migration-chain'
run be-rbac-integrity   "$BE" 'pnpm verify:rbac-integrity'
run be-openapi          "$BE" 'pnpm openapi:check'

run fe-typecheck        "$FE" 'pnpm type-check'
run fe-routes           "$FE" 'pnpm check:routes'
run fe-effect-fetches   "$FE" 'pnpm check:effect-fetches'
run fe-formatters       "$FE" 'pnpm check:formatters'
run fe-empty-states     "$FE" 'pnpm check:empty-states'
run fe-query-scope      "$FE" 'pnpm check:query-scope'
run fe-dead-code        "$FE" 'pnpm check:dead-code'
run fe-route-access     "$FE" 'pnpm check:route-access-contract'
run fe-contract-drift   "$FE" 'pnpm check:contract-drift'
run fe-contract-vendor  "$FE" 'pnpm check:contract-vendor'
run fe-module-manifest  "$FE" 'pnpm check:module-manifest'
run fe-client-pages     "$FE" 'pnpm check:client-pages'
run fe-icon-labels      "$FE" 'pnpm check:icon-labels'
run fe-server-seam      "$FE" 'pnpm verify:server-data-seam'

echo "SWEEP-COMPLETE"
