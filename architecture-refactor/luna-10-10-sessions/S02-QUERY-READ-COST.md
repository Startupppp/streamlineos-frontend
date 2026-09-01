# S02 — Query bounds and read cost

## Objective

Eliminate every actionable or unclassified growing read without data-loss caps. Prove stable pagination and production-shaped query cost. This ticket excludes CRM and Inventory.

## Baseline

Run `pnpm -C backend check:unbounded-reads` and record exact paths and counts. The latest root run found 0 actionable offsets, 223 actionable unbounded reads, and 0 unclassified paths.

## Work

- [x] Classify every unclassified path from source behavior. The current scan has 0 unclassified paths and the three unsupported `BOUNDED` claims were restored to `ACTIONABLE`; fixing the remaining growing reads is tracked below.
- [ ] Process actionable reads in cohesive service batches. Use keyset cursors for interactive lists, resumable keyset/batch loops for sweeps, streaming or queued files for exports, and explicit small-set invariants only where schema/business constraints prove the set is bounded.
- [ ] Preserve stable sort plus unique tie-breaker, tenant/filter dimensions in signed cursor payloads, `limit + 1` sentinel reads, hard validated page limits, and cursor reset when scope/filter/sort changes.
- [ ] Remove `SELECT *`, broad projections, fetch-then-filter/count, per-row queries, redundant count queries, and accidental N+1 expansion.
- [ ] Ensure every primary, fallback, retry, export and exception query includes tenant scope and soft-delete/lifecycle predicates.
- [ ] Add tenant-leading and sort-covering indexes only for measured access patterns. Avoid write-amplifying speculative indexes.
- [ ] Add duplicate-sort-value, boundary, invalid/cross-tenant cursor, mutation-between-pages, retry/resume, overflow and no-row-loss tests.
- [ ] Seed production-shaped HRMS, Payroll, Build, Home, Chat, Calendar, Notifications, Knowledge and Accounting data.
- [ ] Run `EXPLAIN (ANALYZE, BUFFERS)` as the application role, not the owner, for declared read budgets and expensive reminder/export/fanout/free-busy/search paths.
- [ ] Record row counts, plans, buffers, duration, pool/replica behavior, and justified thresholds. Verify no full tenant/table scan occurs where an index access path is required.
- [ ] Re-run backend typechecks and query/read-budget tests.

## Exit criteria

- [ ] `check:unbounded-reads` reports zero actionable and zero unclassified reads, zero actionable offsets, and zero unordered paging.
- [ ] No workflow silently truncates results.
- [ ] Production-shaped plans meet declared budgets with at least 40% capacity headroom where this ticket can measure it.
- [ ] Tests prove isolation, stable pagination, bounded memory and resumability.

## Execution record — 2026-09-01

- Baseline rerun: `check:unbounded-reads` scans 2,097 service files across 74 modules; 0 actionable offsets, 223 actionable unbounded reads, 0 unordered paging, and 0 unclassified paths. The gate itself passes because actionable entries are ratcheted rather than rejected.
- Parallel source-backed batches completed HR onboarding, Payroll payout, Chat/Calendar, and Access/Organization/RBAC work, with continuation/batch tests and tenant predicates preserved. The remaining actionable reads are still open; CRM/Inventory exclusions stay excluded. Three classifications that lacked source proof were restored to ACTIONABLE instead of being suppressed.
- Tenant index coverage and the read-budget walker passed in parallel verification. Production-shaped Build plans still lack the required covering index, HR read-cost fixtures are under-seeded, and the request-transaction measurement is blocked because the API is unavailable at `localhost:1500`.
- Required verification is not green: backend `typecheck` and `check:spec-typecheck` fail on broad schema/API drift (including Build ticket fields, cursor response contracts, billing cursor contracts, support projections, and timesheet relations). No acceptance checkbox is checked from these failures.
- Completion remains open until all actionable reads are corrected, source-backed continuation/overflow tests and query-plan evidence exist, and all required typechecks pass. Superseded ticket paths must not be recreated.
