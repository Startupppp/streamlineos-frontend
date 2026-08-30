# L31 Operator Evidence Report

**Status:** Complete. All 7 operator-blocked infrastructure rows are OPEN. Compliance row is OPEN with both code gaps and infrastructure gaps.

## Self-tests run and results

**41 self-tests run. 41 PASS. 5 FAIL (cannot run — missing HR schema module).**

All `.mjs` guard scripts pass. TypeScript scripts that import through `src/db/schema/index.ts` → `hr/offboarding.ts` → `./hiring` (does not exist) fail to load. Root cause: `backend/src/db/schema/hr/offboarding.ts:9` imports `./hiring` which has no corresponding file. Affects: `cell:admission:self-test`, `cell:degraded:self-test`, `auth:benchmark:self-test`, `openapi:check:self-test`, and `db:check-read-budgets:self-test` (which fails for a different reason: `relation "chat_messages" does not exist` in the dev DB).

## Compliance drill failure mode

`pnpm compliance:drill` (dry-run) exits 0 and produces 7 audit rows for all 6 required actions. The script itself reports three gaps honestly:
1. **Export worker missing:** `hr_data_requests` tracks requests but no worker produces a data file. Interface specified in OPERATOR-EVIDENCE.md.
2. **Object storage purge missing:** `PURGE_ADAPTER_REGISTRY.object_storage` returns `FAILED` ("not yet implemented, manual cleanup required"). Purge contract specified in OPERATOR-EVIDENCE.md.
3. **Database rows adapter does not cascade-delete:** marks `statusV2=PURGED` only. Physical batch deletion design specified in OPERATOR-EVIDENCE.md.

The drill passes its audit-evidence assertions. It does not pass GDPR compliance because export and deletion are incomplete.

## Runbooks written

7 runbooks created in `architecture-refactor/runbooks/`:
- RB-01-cell-isolation.md
- RB-02-pitr-backup.md
- RB-03-read-replica.md
- RB-04-recovery-drill.md
- RB-05-production-load.md
- RB-06-live-alert-delivery.md
- RB-07-per-cell-cost.md

Each contains: preconditions, exact script commands (verified against package.json), expected output, pass/fail thresholds, evidence recording location, rollback steps.

## OPEN row count

**8 rows total — 8 OPEN.** (7 operator-blocked; 1 compliance with code + infrastructure gaps)

Zero rows are PASS. Production readiness stays below 10/10 until the operator executes the runbooks and evidence is filed in `architecture-refactor/runbooks/evidence/`.

## OUT-OF-OWNERSHIP (code must be fixed by another lane)

- `backend/src/db/schema/hr/offboarding.ts:9` — imports `./hiring` which does not exist; blocks 4 TypeScript self-tests and the OpenAPI check.
- Dev DB is missing `chat_messages` table — blocks `db:check-read-budgets:self-test`.
- Export data request worker needs to be built (interface in OPERATOR-EVIDENCE.md).
- Storage `purgeOrgPrefix` method needs to be built (interface in OPERATOR-EVIDENCE.md).
- Org purge saga needs physical row deletion (design in OPERATOR-EVIDENCE.md).
- Operator access design needs implementation: time-bound session, approval record, content-blind role, row-level audit (design in OPERATOR-EVIDENCE.md).
