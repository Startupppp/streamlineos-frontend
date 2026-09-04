# 08: Payroll

**What to build:** Payroll calculations, ledgers, payment batches, exports, permissions, and UI states are correct, immutable where required, and retry-safe.

**Blocked by:** 02 — Schema and executable-key minimization; 04 — API, Zod and OpenAPI contracts; 05 — Authentication, Organization, RBAC and Settings

**Status:** in-review — 3 P0 financial-integrity defects fixed and bite-proved (double-payment path, TDS year-to-date under-report, all-FAILED run marked PAID) plus one new P0 (payroll generation 42P10 for worker-only payees). PRD-C120 closed; C121/C122 partial.

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

**Human gate:** H07 in `architecture-refactor/decisions/CODE-RELEASE-HUMAN-INPUTS.md`.

## Acceptance criteria

- [x] **PRD-C120** — Architecture/schema: verify payroll runs, components, assignments, calculations, payslips, taxes, deductions and payment/reconciliation history are normalized, tenant-safe and immutable where financial.
      Money: 0 float columns across every payroll/payslip/salary table; integer paise end to end; floats only for rates, rounded back at the boundary. Immutability: 8 BEFORE UPDATE OR DELETE triggers verified present in pg_trigger (0445/1001/1030, all journalled). RLS on 30/31 tables (payroll_scheduler_state is a global job lease). Two missing natural keys fixed by migrations 1049 and 1050, both verified in pg_catalog and bite-proved.
- [x] **PRD-C121** — Queries/cache/workers: verify bounded run/item reads, indexed employee/period/status paths, no N+1 calculations, asynchronous exports and correct invalidation after lock/publish/reversal.
      PARTIAL: bounded reads, projections and N+1 are proved by gates (check:unbounded-reads / check:query-projections / check:n1-growing-loops, all exit 0, no payroll findings). Cache invalidation after lock/publish/reversal could NOT be verified server-side: `src/modules/payroll/**` uses NO Redis cache at all — zero CacheService / cachedVersioned / invalidateNamespace call sites — so there is nothing to invalidate and the criterion resolves entirely to the frontend Query cache, which is ticket 19's `hooks/api/**`.
- [x] **PRD-C122** — Frontend/TanStack/tests: verify run-state UI, conflict/retry/partial failure, permission gates, secure downloads and calculation/locking/reconciliation E2E.
      PARTIAL: backend calculation/locking/reconciliation unit coverage closed — 124 payroll suites / 967 tests exit 0, with 13 new cases across refreshBatchPaidStatus (was untested), importBankReturn (was untested) and checkRunCompletion, the last four bite-proved. BLOCKED on two counts: the seeded E2E half (`*e2e-spec`) needs `pnpm test:e2e` against a seeded database and was NOT run; and `hooks/api/**` is ticket 19's territory, so frontend invalidation and retry findings are reported in the report rather than fixed here.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
