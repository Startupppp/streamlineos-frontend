# S02 — Query bounds and read cost

## Objective

Eliminate every actionable or unclassified growing read without data-loss caps. Prove stable pagination and production-shaped query cost. This ticket excludes CRM and Inventory.

## Baseline

Run `pnpm -C backend check:unbounded-reads` and record exact paths and counts. The latest root run found 0 actionable offsets, 278 actionable unbounded reads, and two unclassified files: Payroll filings source and Payroll reports read.

## Work

- [ ] Classify every unclassified path from source behavior; fix growing reads rather than suppressing them.
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
