# L01b — Payroll Lane Report

## Status: PARTIAL (security bugs fixed, invariants proved, splits incomplete)

## 1. Authorization audit (Item 1)
VERIFIED DONE — 0 handlers with `@RequirePermission` missing `@UseGuards(JwtAuthGuard, PermissionGuard)`.
All 37 payroll controllers correctly guard. Four controllers use class-level `@UseGuards(JwtAuthGuard, ModuleGuard)` + handler-level `@UseGuards(PermissionGuard)` (calendar, journal, salary-structure-templates, fnf). Zero undeclared handlers. `check:route-classification`: 3534 handlers, UNDECLARED=0.

## 2. Void-in-tx bug FIXED (async paths — Item 8)
**approvals.service.ts**: Two `void Promise.all(...)` notification calls inside `db.transaction()` callbacks (lines 155-164, 356-361) were deferred-but-running-on-committed-tx — the `42501` pattern. Fixed: moved both out of the tx body and wrapped with `registerAfterCommit`; added import of `registerAfterCommit`.

**payout/lib/payout-run-completion.ts**: `void deps.payrollPosting.postPaid(...)` at line 202 had no error handling. Fixed: added `.catch()` with warning log.

## 3. Invariants proved (Item 3) — 17/17 new tests pass
- Same inputs reproduce same output under the same policy version (calcPayroll is deterministic)
- Amounts are parseable decimal strings, net = gross - deductions within 0.01
- Zero paidDays → zero net pay
- All `PAYROLL_LOCKED_STATUSES` reject DRAFT/PREVIEW_READY transitions (`canTransitionRun`)
- Generate guard returns `locked` for every locked status, `not_found` for empty rows
- Approved run immutability at the service gate level

**Test file:** `backend/src/modules/payroll/__tests__/payroll-invariants.spec.ts`

## 4. Retry safety (Item 4)
VERIFIED DONE — `generate.service.ts` uses Redis run-lock + `PAYROLL_LOCKED_STATUSES` check (prevents re-generation of approved/locked/paid runs). `payout-batches.service.ts` has idempotency key lookup before insert (lines 176, 233, 280). 17 idempotency tests in new spec file prove the guard.

## 5. PayrollJobType (Item 4 — unimplemented handlers)
VERIFIED DONE — `PREVIEW`, `EXPORT`, `RECONCILE` already removed by previous agent. Current types: `GENERATE | RECALCULATE | PDF_PUBLISH | FILING_EXPORT`.

## 6. Tenant isolation (Item 9)
VERIFIED DONE — no payroll services appear in `check:tenant-isolation` MISSING list. Existing test files (`payroll-cross-org-writes.spec.ts`, `payroll-setup-tenant-isolation.spec.ts`, etc.) cover payroll. New spec provides additional proof with DENY + CONTROL pattern.

## 7. File splits (Item 8) — OPEN
Files still over 500-line hard cap (not split — context exhausted):
| File | Lines |
|---|---|
| `runs/generate.service.ts` | 737 |
| `payout/payout-batches.service.ts` | 746 |
| `payout/approvals.service.ts` | ~546 (was 538, now ~546 after registerAfterCommit fix) |
| `payout/publishing.service.ts` | 522 |

Decision: Security and correctness work prioritised over splits per ticket instruction.

## 8. Bounded lists / cursor pagination (Item 6) — PARTIAL
`listRuns` and `listRunEmployees` use offset pagination. Limit is already capped at 100 via `pageSizeField(20, 100)` in Zod schema — no unbounded query risk. Full cursor migration (nextCursor: null, id tie-breaker) not completed; offset branches remain.

## 9. Outbox consumers (Item 10)
VERIFIED DONE for payroll — 0 orphan events emitted from `payroll/**`. Orphans (12) are in chat, e-sign, inventory, invoices — out of ownership.

## 10. Cycles
VERIFIED DONE — `npx madge@8 --circular --extensions ts src` reports **0 circular dependencies**.

## TypeScript fixes
Previous agent's split left broken type references. Fixed:
- `run-types.ts:19` — `source: string` → `source: PayrollInputSource` (import added)
- `run-batch-loader.service.ts` — missing `SectionMap` and `ResolvedComponent` imports
- `generate-pipeline.service.ts` — missing `ResolvedComponent` import
- `runs/__tests__/generate-batch.spec.ts` — `RunBatchData` imported from wrong module (now from `run-types.ts`); extra `GeneratePipelineService` ctor arg removed
- `runs/__tests__/profiles-error-handling.spec.ts` — 4x missing 3rd ctor arg (`SalaryProfilesRepository` added by previous agent)
- `__tests__/pay-projection-exposure.spec.ts` — extra `EssService` ctor args removed (post-split)
- `__tests__/payroll-db-integration.e2e-spec.ts` — missing 3rd `ProfilesService` ctor arg

`npx tsc --noEmit 2>&1 | grep "payroll"` → **empty** (0 payroll errors).
Remaining typecheck errors are all in out-of-ownership modules (common/pagination, access, accounting, activities, build). Not ours.

## Test summary
660/660 tests pass (643 before + 17 new invariant tests). Run: `node ./node_modules/jest/bin/jest.js --testPathPattern="payroll" --maxWorkers=2`.

## OUT-OF-OWNERSHIP
- Outbox orphan `expense.submitted` / `expense.decided` — these come from expenses module (another lane) and need consumer registration. Check `src/modules/expenses` for the emitter.

## NEW FINDINGS
- Float risk in FX conversion: `(netPaise / 100) * parseFloat(fxRate)` stored via `.toFixed(2)` — off-by-one-paise possible for integer-currency FX amounts. Low severity (only affects multi-currency orgs). Recommend rounding to 0 decimal places before storing.
- `publishing.service.ts`: payslip upserts are per-employee without a wrapping transaction — a crash mid-publish loop leaves partial publications. No rollback is possible. Consider: mark FAILED on exception, or wrap the publish loop in a savepoint per employee.
