#!/usr/bin/env bash
cd "$(dirname "$0")/../frontend" || exit 1

GATES="cycles feature-cycles file-sizes route-thinness named-handlers import-direction
permission-catalog permission-binding route-access-contract response-contracts
contract-drift contract-vendor request-params query-signal query-scope gated-reads
page-state-usage type-assertions test-integrity test-typecheck gate-wiring
command-catalog module-manifest client-pages home-manifest tenant-neutral
empty-states formatters over-300 colors effect-fetches routes icon-labels
seo-metadata prd-traceability"

pass=0; fail=0
for g in $GATES; do
  st_out=$(pnpm -s "check:${g}:self-test" 2>&1); st_rc=$?
  gate_out=$(pnpm -s "check:${g}" 2>&1); gate_rc=$?
  if [ $st_rc -ne 0 ]; then
    echo "SELFTEST-FAIL  check:${g}  (self-test rc=${st_rc}, gate rc=${gate_rc})"
    echo "$st_out" | tail -4 | sed 's/^/      /'
    fail=$((fail+1))
  elif [ $gate_rc -ne 0 ]; then
    echo "GATE-FAIL      check:${g}  (gate rc=${gate_rc})"
    echo "$gate_out" | tail -8 | sed 's/^/      /'
    fail=$((fail+1))
  else
    echo "OK             check:${g}"
    pass=$((pass+1))
  fi
done
echo "=== frontend gates: ${pass} ok, ${fail} failing ==="
