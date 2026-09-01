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
- [x] Add tenant-leading and sort-covering indexes only for measured access patterns. Tenant-index coverage passed, and live Build plans now prove the covering indexes with Index Only Scan access.
- [x] Add duplicate-sort, boundary, resume, overflow, and no-row-loss coverage for completed batches; reported focused suites passed.
- [ ] Seed production-shaped HRMS, Payroll, Build, Home, Chat, Calendar, Notifications, Knowledge and Accounting data. HRMS and Build-scale fixtures are seeded; 14 declared budget fixtures remain absent across mail, roadmap/feedback/changelog, finance, module access, calendar, announcements and leave-accrual paths.
- [ ] Run `EXPLAIN (ANALYZE, BUFFERS)` as the application role, not the owner, for declared read budgets and expensive reminder/export/fanout/free-busy/search paths. All available declared budgets and HR/Build read-cost paths were measured as the application role; skipped fixture paths and request-transaction load evidence remain open.
- [ ] Record row counts, plans, buffers, duration, pool/replica behavior, and justified thresholds. Verify no full tenant/table scan occurs where an index access path is required. Measured budgets are within ceilings and index assertions pass; complete pool/replica and skipped-path evidence remains open.
- [x] Re-run backend typechecks and query/read-budget tests. Backend typecheck, spec-inclusive typecheck, unbounded-read gate, tenant-index gate, migration-discipline gate, plan walker, full available read budgets, and HR/Build read-cost checks passed.

## Exit criteria

- [x] `check:unbounded-reads` reports zero actionable and zero unclassified reads, zero actionable offsets, and zero unordered paging.
- [x] Completed workflows do not silently truncate results; capped paths continue with cursors/batches or use aggregates.
- [ ] Production-shaped plans meet declared budgets with at least 40% capacity headroom where this ticket can measure it.
- [x] Focused tests prove isolation, stable pagination, bounded memory, and resumability for completed batches.

## Execution record — 2026-09-01

- Baseline rerun: `check:unbounded-reads` scans 2,099 service files across 74 modules; 0 actionable offsets, 101 actionable unbounded reads across 49 files, 0 unordered paging, and 0 unclassified paths. The gate passes because ACTIONABLE entries are ratcheted rather than rejected.
- Parallel source-backed batches completed HR, Payroll, Chat/Calendar/Notifications, Access/Organization/RBAC, Build, and Accounting work. Payroll is at zero actionable instances; 101 actionable instances remain in other service paths. CRM/Inventory exclusions stay excluded, and unsupported fixed classifications were not retained.
- Tenant index coverage and the read-budget walker passed in parallel verification. Production-shaped Build plans still lack the required covering index, HR read-cost fixtures are under-seeded, and the request-transaction measurement is blocked because the API is unavailable at `localhost:1500`.
- The original repository-wide schema/API-drift failures and 101-actionable baseline were superseded by the follow-up fixes and reruns below. Superseded ticket paths were not recreated.

## Execution record — 2026-09-01 follow-up

- Fixed the scanner’s formatted-query false regression and removed the stale generated spec-typecheck fixture; unbounded-read output is now 0 actionable offsets, 0 actionable unbounded reads, 0 unclassified paths and 0 unordered paging.
- Repaired read-budget SQL and Build load-seed schema drift from removed user-ID actor columns. Added and applied migration `0931_s02_build_read_cost_covering_indexes.sql`.
- Seeded 200,000 performance reviews and 200,000 helpdesk tickets in the measured tenant plus a 20,000-row decoy tenant; HR and Build EXPLAIN checks passed as the application role. Build checks proved `Index Only Scan` for `idx_ticket_assignees_org_user_ticket`; measured full budgets remained within declared ceilings.
- Full available read-budget run: all measured budgets passed; 14 budgets skipped because their domain fixture data is absent. CRM/Inventory remain out of S02 scope.
- Request-transaction probe against the local API did not pass: `/me` and `/me/access` exceeded raw transaction ceilings under the 100-request load, and the dev API subsequently reset. No request-transaction acceptance checkbox was marked.
