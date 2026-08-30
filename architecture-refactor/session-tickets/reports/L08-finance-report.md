# L08 Finance Report

## Status: PARTIAL (buffer measurement OPEN; pre-existing type errors noted)

## Buffer measurement
OPEN — index `idx_invoices_org_duedate_status_id` (migration 0663) verified present in journal. Live-DB `EXPLAIN (ANALYZE, BUFFERS)` measurement as `streamline_app` with tenant GUC requires a running Neon connection unavailable in this session. Index structure is correct (leads with `org_id`, partial on ISSUED/PARTIALLY_PAID/OVERDUE, includes `id` for keyset cursor).

## Files split

| File | Before | After |
|---|---|---|
| `banking/reconciliation.service.ts` | 644 | 423 (matching ops only) |
| `banking/reconciliation-workspace.service.ts` | — | 120 (getWorkspace) |
| `banking/reconciliation-rules.service.ts` | — | 136 (rules CRUD) |
| `ap/payment-runs.service.ts` | 578 | 357 (CRUD lifecycle) |
| `ap/payment-run-executor.service.ts` | — | 273 (executeRun + FX) |

Controller updated in each case; modules updated to register new providers.

## Guard audit
0 handlers with `@RequirePermission` missing `PermissionGuard`. All 39 finance controllers verified.

## Outbox consumer
`accounting.bill.paid` (emitted from `payment-run-executor.service.ts`) now has consumer `accounting-bill-paid-consumer.service.ts` using `accounting.payment.recorded` notification key. Registered in `FinanceApModule`.

## Tenant isolation
New spec `ar/reminders-tenant-isolation.spec.ts`: 5 tests — cross-tenant DENY + same-tenant CONTROL for updatePolicy and deletePolicy; namespace isolation for listPolicies. All pass.

## Test summary
148 passed, 0 failed (up from 143). 15 suites.

## Validation
- `pnpm check:route-classification`: PASS — 3534 handlers, 0 undeclared
- `pnpm check:migration-chain`: PASS
- `pnpm check:outbox-consumers`: accounting.bill.paid closed; 18 remaining orphans all outside `finance/**`
- `pnpm check:tenant-isolation`: 326 missing (60% covered, up from 59% before this session)
- `pnpm typecheck`: 8 pre-existing errors in `tax/tax-*.service.ts` (resolveSystemAccount not on FinancePostingService type — present in HEAD before this session, not introduced here); 0 new errors from my files

## OUT-OF-OWNERSHIP
- `backend/src/modules/accounting/posting/finance-posting.service.ts` — `resolveSystemAccount` method missing from type; 8 call sites in `finance/tax/` are broken. Another lane owns `accounting/**`.
