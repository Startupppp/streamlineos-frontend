# L01 Payroll Lane Report — S03

## Status: PARTIAL — core splits + item 4 + item 8 done; items 1/3/5/6/9 and remaining splits open

## Items Done

**Item 4 (PREVIEW/EXPORT/RECONCILE jobs always fail)**
- Removed `"PREVIEW"`, `"EXPORT"`, `"RECONCILE"` from `PayrollJobType` union and `enqueueSchema` z.enum
- Removed always-throwing `case` handlers from the job worker
- Files: `jobs/payroll-jobs.service.ts`, `jobs/jobs.controller.ts`, `jobs/payroll-jobs-worker.service.ts`
- Test fixed: `jobs/__tests__/payroll-jobs-enqueue-error.spec.ts`

**Item 8 (Fire-and-forget outbox)**
- `generate.service.ts` L509 used `void notifyExceptions(...).catch()` after tx commit
- Fixed to `registerAfterCommit` with inline fallback
- File: `runs/generate.service.ts`

**File splits completed**

| File | Before | After |
|---|---|---|
| `insights/ess.service.ts` | 657 lines | 452 lines |
| `runs/generate-pipeline.service.ts` | 696 lines | 261 lines |
| Created: `insights/ess-self-service.service.ts` | — | 223 lines |
| Created: `runs/run-batch-loader.service.ts` | — | 289 lines |
| Created: `runs/run-types.ts` (shared types, breaks cycle) | — | 52 lines |

**Circular dependency**
- Cycle introduced by `generate-pipeline.service.ts` ↔ `run-batch-loader.service.ts` via cross-imported types
- Fixed: moved `ProfileData` + `RunBatchData` to neutral `runs/run-types.ts`
- `madge --circular` output: `✔ No circular dependency found!`

## Items Open (not completed)

**Item 1 (payroll authorization):** Not audited — no changes made.

**Item 2 (run generation file splits still needed):**
- `runs/generate.service.ts` — 737 lines (over 500 cap)
- `payout/payout-batches.service.ts` — 746 lines
- `payout/approvals.service.ts` — 538 lines
- `payout/publishing.service.ts` — 522 lines
- Context exhausted before these splits could be completed

**Item 3 (monetary/approval invariants):** Not audited.

**Item 5 (projections + async export):** Not audited.

**Item 6 (bounded lists):** Not audited.

**Item 9 (isolation coverage):** No new cross-tenant payroll isolation tests added.

**Payroll half of item 10:** Not started.

## Tests

64 suites, 643/643 passed. No new payroll isolation specs added.

## Out-of-ownership needs

None — all edits are within `backend/src/modules/payroll/**`.
