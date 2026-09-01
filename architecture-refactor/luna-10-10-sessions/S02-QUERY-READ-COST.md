# S02 — Query bounds and read cost

## Objective

Eliminate every actionable or unclassified growing read without data-loss caps. Prove stable pagination and production-shaped query cost. This ticket excludes CRM and Inventory.

## Baseline

Run `pnpm -C backend check:unbounded-reads` and record exact paths and counts. The latest root run found 0 actionable offsets, 101 actionable unbounded reads, and 0 unclassified paths.

## Work

- [x] Classify every unclassified path from source behavior. The current scan has 0 unclassified paths and the three unsupported `BOUNDED` claims were restored to `ACTIONABLE`; fixing the remaining growing reads is tracked below.
- [x] Process the in-scope actionable reads in cohesive service batches using keyset cursors, resumable batches, aggregates, and narrow projections.
- [x] Preserve stable sort/tie-breakers, tenant scope, validated limits, and cursor scope handling in changed workflows.
- [x] Remove the broad projections and fetch patterns addressed by the completed batches; focused reviews found no new N+1 or silent data-loss cap.
- [x] Ensure tenant predicates remain on changed primary/fallback/retry/export queries; focused isolation suites passed.
- [ ] Add tenant-leading and sort-covering indexes only for measured access patterns. Tenant-index coverage passed, but live Build plans still need covering-index evidence.
- [x] Add duplicate-sort, boundary, resume, overflow, and no-row-loss coverage for completed batches; reported focused suites passed.
- [ ] Seed production-shaped HRMS, Payroll, Build, Home, Chat, Calendar, Notifications, Knowledge and Accounting data.
- [ ] Run `EXPLAIN (ANALYZE, BUFFERS)` as the application role, not the owner, for declared read budgets and expensive reminder/export/fanout/free-busy/search paths.
- [ ] Record row counts, plans, buffers, duration, pool/replica behavior, and justified thresholds. Verify no full tenant/table scan occurs where an index access path is required.
- [ ] Re-run backend typechecks and query/read-budget tests. Read-budget/index walkers passed, but backend typecheck and spec-inclusive typecheck remain red on repository-wide schema/API drift.

## Exit criteria

- [ ] `check:unbounded-reads` reports zero actionable and zero unclassified reads, zero actionable offsets, and zero unordered paging.
- [x] Completed workflows do not silently truncate results; capped paths continue with cursors/batches or use aggregates.
- [ ] Production-shaped plans meet declared budgets with at least 40% capacity headroom where this ticket can measure it.
- [x] Focused tests prove isolation, stable pagination, bounded memory, and resumability for completed batches.

## Execution record — 2026-09-01

- Baseline rerun: `check:unbounded-reads` scans 2,099 service files across 74 modules; 0 actionable offsets, 101 actionable unbounded reads across 49 files, 0 unordered paging, and 0 unclassified paths. The gate passes because ACTIONABLE entries are ratcheted rather than rejected.
- Parallel source-backed batches completed HR, Payroll, Chat/Calendar/Notifications, Access/Organization/RBAC, Build, and Accounting work. Payroll is at zero actionable instances; 101 actionable instances remain in other service paths. CRM/Inventory exclusions stay excluded, and unsupported fixed classifications were not retained.
- Tenant index coverage and the read-budget walker passed in parallel verification. Production-shaped Build plans still lack the required covering index, HR read-cost fixtures are under-seeded, and the request-transaction measurement is blocked because the API is unavailable at `localhost:1500`.
- Required verification is not green: backend `typecheck` and `check:spec-typecheck` fail on broad schema/API drift (including Build ticket fields, cursor response contracts, billing cursor contracts, support projections, and timesheet relations). No acceptance checkbox is checked from these failures.
- Completion remains open until the remaining 174 ACTIONABLE reads are corrected, production-shaped query-plan evidence exists, and all required typechecks pass. Superseded ticket paths must not be recreated.
