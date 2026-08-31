# V10 — Tick Audit Report

**Date:** 2026-08-31
**Verifier:** V10 (independent auditor, read-only)
**Method:** source inspection, grep, wc -l, script execution, targeted jest
**DB probes:** not run (no connection available in session)

---

## PRIOR CRITICALS STATUS

Both V8 and V9 criticals were re-verified before sampling new findings:

| Finding | Status |
|---|---|
| V8 CRITICAL: `billing.controller.ts` still 516 lines; new controllers unregistered (S05 §2) | **FIXED** — 219 lines; 4 controllers registered in `billing.module.ts:29` |
| V9 CRITICAL: `statements.service.ts` three queries unbounded; `STATEMENT_LINE_CAP` never written (S05 §6) | **FIXED** — `STATEMENT_LINE_CAP = 1000` at line 8; `.limit(STATEMENT_LINE_CAP)` at lines 45, 49, 56 |

---

## FINDING 1 — CRITICAL: `check:tenant-isolation` static gate FAILS at 825/840 (15 services missing)

**Tickets claiming:** S01 §9, S07 §9, S08 §10, S10 §1, `FINAL-VERIFICATION.md`

All cite: `check:tenant-isolation` reports **818/818 tenant-owned services** have a declared isolation test **(100%)**.

**What was found:**

```
node src/scripts/check-tenant-isolation-coverage.mjs
Service files with db handle   900
  — tenant-owned               840
  — global/platform            60
Isolation test files found     501
Services with a DECLARED test  825 / 840  (98%)

FAIL — 15 tenant-owned service(s) have no cross-tenant negative test (98% covered).
```

Fifteen services reported MISSING:

```
src/modules/crm/core/crm-ce-dashboard.service.ts
src/modules/crm/core/crm-organizations-merge.service.ts
src/modules/e-sign/sign-public-form.service.ts
src/modules/inventory/purchase-orders/grn-receive.service.ts
src/modules/kb/retrieval/kb-article-reindex.service.ts
src/modules/kb/retrieval/kb-indexing.service.ts
src/modules/kb/retrieval/kb-ingestion-checkpoint.service.ts
src/modules/party/party-revert.service.ts
src/modules/payroll/payout/batch-status.service.ts
src/modules/payroll/runs/loan-recovery.service.ts
src/modules/payroll/runs/run-data-loader.service.ts
src/modules/payroll/runs/run-result-persister.service.ts
src/modules/platform/platform-analytics.service.ts
src/modules/timesheets/core/approvals-bulk.service.ts
src/modules/timesheets/core/timesheet-analytics.service.ts
```

**Root cause investigation:**

22 new services were added since the gate was last verified (818 → 840 tenant-owned). The sessions that ticked 818/818 were accurate at that moment; splits in subsequent lanes created new services without updating coverage.

A subset of the 15 MISSING services DO have isolation specs that exercise them. Manual verification:

| Service | Isolation spec exists | Spec passes |
|---|---|---|
| `loan-recovery.service.ts` | `payroll-runs-c-tenant-isolation.spec.ts` (imports, 6 tests) | 6/6 PASS (jest verified) |
| `run-data-loader.service.ts` | `payroll-runs-c-tenant-isolation.spec.ts` | 6/6 PASS |
| `run-result-persister.service.ts` | `payroll-runs-c-tenant-isolation.spec.ts` | 6/6 PASS |
| `approvals-bulk.service.ts` | `timesheets-analytics-tenant-isolation.spec.ts` | not re-run |
| `timesheet-analytics.service.ts` | `timesheets-analytics-tenant-isolation.spec.ts` | not re-run |
| `batch-status.service.ts` | `batch-status-tenant-isolation.spec.ts` | not re-run |
| `kb-article-reindex.service.ts` | `kb-retrieval-tenant-isolation.spec.ts` | not re-run |
| `kb-indexing.service.ts` | `kb-retrieval-tenant-isolation.spec.ts` | not re-run |
| `kb-ingestion-checkpoint.service.ts` | `kb-retrieval-tenant-isolation.spec.ts` | not re-run |

Manual trace of the gate's matching logic (class name regex, path includes check) for `LoanRecoveryService` against `payroll-runs-c-tenant-isolation.spec.ts` confirms the spec SHOULD be matched by `hasIsolationTest`. The gate appears to have a matching bug on the current environment (Windows paths), causing it to incorrectly classify these as MISSING.

**Remaining uncertainty:** `crm-organizations-merge.service.ts`, `sign-public-form.service.ts`, `grn-receive.service.ts`, `platform-analytics.service.ts`, `party-revert.service.ts`, and `crm-ce-dashboard.service.ts` were not individually verified — they may have no isolation specs at all or may be gate false-positives like the payroll and KB services.

**Risk:** The static gate FAILS at exit code 1. Even if all 15 are gate false-positives (environment bug), the gate's claim of 818/818 is stale — the correct denominator is 840. The FINAL-VERIFICATION.md row "Services with a DECLARED test 818/818 (100%)" is outdated and must be updated once the gate bug is confirmed.

**Command:** `cd backend && node src/scripts/check-tenant-isolation-coverage.mjs`

---

## FINDING 2 — NOTABLE: `check:mock-surface` reports 6 genuine defects; MOCKFIX1 claimed 0

**Ticket:** MOCKFIX1, claiming "Zero genuine phantom methods remain" with exactly 5 documented scanner false positives (Drizzle chain methods).

**What was found:**

```
cd backend && node src/scripts/check-mock-surface.mjs
...
Class: StockEngineBatchService
  Real class: src\modules\inventory\stock-engine\stock-engine-batch.service.ts
  [PHANTOM] .execute() — exists on mock but NOT on the real class
    spec: src\modules\inventory\inv-quality-counts-reports-isolation.spec.ts

Genuine defects   : 6
```

The 6th entry is `StockEngineBatchService.execute()` at `inv-quality-counts-reports-isolation.spec.ts:39,156,176`. This is NOT one of the documented Drizzle chain false positives.

Verification: `stock-engine-batch.service.ts` exposes exactly two public methods — `executeMany` (line 43) and `invalidateCaches` (line 344). There is no `.execute()` method. The spec mocks the service with `{ execute: jest.fn() }`, which is a phantom.

The service that uses `StockEngineBatchService` is `quality-recalls.service.ts` (line 149: `this.engine.executeMany(...)`). The isolation spec tests a different service (`quality-counts-reports`) that also injects `StockEngineBatchService` but likely calls `executeMany`. If the test asserts anything about the mock call, those assertions are vacuous.

**Pattern match:** Pattern #2 (narrated fix never written) in the sense that MOCKFIX1 declared clean and a new phantom appeared. Most likely introduced after MOCKFIX1 ran, by a lane that added the quality-counts-reports isolation spec with the wrong method name.

**Risk:** Any assertion in `inv-quality-counts-reports-isolation.spec.ts` about `StockEngineBatchService.execute()` is testing a stub that production never calls.

**Command:** `cd backend && node src/scripts/check-mock-surface.mjs`

---

## CONFIRMED V9 NOTABLE (still unresolved)

**Finding from V9:** `channel-sidebar.tsx` (535 lines) and `huddle-panel.tsx` (513 lines) exceed the 500-line hard limit with no live exception record.

**Current state:**

```
wc -l frontend/features/chat/channel-sidebar.tsx  → 535
wc -l frontend/features/chat/huddle-panel.tsx     → 513
```

Neither file appears in `SPLIT5.md` cohesive catalog exceptions, which lists only:
- `notification-events.catalog.ts` (1054 lines)
- `automation-trigger-data.ts` (605 lines)
- `role-templates.constants.ts` (584 lines)

V9's analysis that the exception files were created and then deleted remains accurate. No new exception record was created to replace them. These two files remain over the 500-line hard limit with no recorded justification.

---

## VERIFIED SOUND

The following priority claims were checked and confirmed correct:

| Claim | Evidence |
|---|---|
| OpenAPI x-exposure fix: 0 → 3,551/3,551 stamps | `node -e` counting operations: `total: 3551 with x-exposure: 3551 missing: 0` |
| @Validate migration: zero controllers on legacy `ZodValidationPipe` | `grep -rn "ZodValidationPipe" src --include="*.ts" -l \| grep -v spec \| grep -v "zod-validation"` returns only `zod-operation-contracts.ts` |
| `/me/*` gate removal: 6 pages use `requireSession()` | `grep -rn "requirePermission\|requireSession" app/(authenticated)/me/**` confirms all 6 pages import `requireSession` only |
| KB ANN MATERIALIZED fence | Migration 0703 line 35: `WITH org_chunks AS MATERIALIZED`; migration 0717 restores the same; `kb-search.service.ts:284` calls `app.search_kb_chunk_ids` |
| `check:contract-vendor` PASSES | `node scripts/check-contract-vendor.mjs` → SHA-256 match confirmed |
| `check:permission-keys` PASSES | 691 keys; exits clean |
| `check:outbox-consumers` PASSES | 18 emitted types, all consumed; exit 0 |
| `check:route-classification` PASSES | 3,539 handlers, 0 UNDECLARED |
| Actor contraction properly OPEN | `scan-legacy-org-actors.mjs --check` → "Ratchet OK: 689/689 remaining (0 migrated since baseline)" |
| `statements.service.ts` bounded | `STATEMENT_LINE_CAP = 1000` at line 8; `.limit()` on all three queries |
| `kb-indexing.service.ts` split: 382 lines | `wc -l` confirms 382 < 500-line ceiling |
| Mock phantom fix: 48 bucket B + 21 bucket C fixed | MOCKFIX1 documents each fix; one new phantom appeared post-MOCKFIX1 |
| `dashboard-hr.service.ts` dead code deleted | File absent from `backend/src/modules/dashboard/`; 4 sub-services confirmed present |
| `billing.controller.ts`: 219 lines; all 4 controllers registered | `wc -l` 219; `billing.module.ts:29` lists all four |
| `workflows/page.tsx` and `accounting/budgets/[budgetId]/page.tsx`: under 500 | 329 and 266 lines respectively |

---

## Summary

| Finding | Ticket | Severity | Pattern |
|---|---|---|---|
| `check:tenant-isolation` gate FAILS at 825/840 (15 missing); gate denominator grew 818→840 with no tick update | S01 §9, S07 §9, S08 §10, S10 §1, FINAL-VERIFICATION | **CRITICAL** | Gate stale after splits added services |
| `StockEngineBatchService.execute()` phantom in mock; MOCKFIX1 declared zero remaining | MOCKFIX1 | Notable | #2 (phantom post-fix) |
| `channel-sidebar.tsx` (535) + `huddle-panel.tsx` (513) exceed 500-line limit with no exception record | S06 §3 (V9 carry) | Notable | #3 (abandoned split, no exception) |

The tenant isolation gate finding requires investigation: the gate fails, but manual tracing shows that some (possibly all) of the 15 MISSING services DO have isolation specs that the gate fails to match on this environment. Before declaring these services uncovered, run `check:tenant-isolation:run` and confirm which of the 15 spec files (if any) fail to execute. If all pass, the bug is in the static gate's matching logic; fix the gate and re-verify the count against the new denominator of 840.
