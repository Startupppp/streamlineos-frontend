# Session 05 — Query Cost, Projections, and Bounded Workflows

## Objective

Eliminate every actionable unbounded read without silently changing product behavior. Rebaseline first; the expected actionable count is about 316.

## Ownership

All included backend services except files actively assigned to Sessions 01–04. Prefer Payroll, Accounting, Finance, Chat, Calendar, Notifications, Inbox, Knowledge, HR, and Build according to current scanner output. Do not edit CRM, Inventory, or landing files.

## Approved remediation patterns

1. Keyset pagination for user-facing collections.
2. Bounded list plus explicit overflow failure when callers cannot safely process more rows.
3. Cursor/lease batches for whole-set workflows such as sweeps, exports, retention, reminders, and fanout.
4. Aggregate query (`count`, `exists`, grouped projection) instead of materializing rows.
5. Explicit narrow projection and set-based SQL instead of N+1 loops or fetch-then-filter.

Never use a fixed limit that hides data, and never mark a path BOUNDED unless the source implementation proves it.

## Work

- [ ] Work in batches of 20–40 actionable instances, grouping related service paths.
- [ ] Add overflow/cursor/batch continuation tests for every changed workflow.
- [ ] Confirm tenant predicates appear in every fallback/exception query.
- [ ] Remove fetch-then-filter, fetch-then-count, and broad select-all projections.
- [ ] Add or validate tenant-leading/sort-covering indexes with query-plan evidence where scale justifies them.
- [ ] Update the classification only after each source path is genuinely corrected.

## Exit criteria

- [ ] `check:unbounded-reads` reports zero actionable unbounded reads and zero unordered paging. Offset-pagination elimination remains exclusively owned by Session 04 and must not regress.
- [ ] No list/export/fanout path introduces an N+1 pattern or data-loss cap.
- [ ] Query-cost/read-budget tests and backend typecheck pass.

## Required commands

```powershell
pnpm -C backend check:unbounded-reads
pnpm -C backend typecheck
pnpm -C backend check:spec-typecheck
```
