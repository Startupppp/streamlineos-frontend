# Session 04 — Cursor Pagination and List Contracts

## Objective

Eliminate every actionable offset-pagination path. Rebaseline with `pnpm -C backend check:unbounded-reads`; the expected current actionable offset count is about 61. The exit condition is exactly zero actionable offsets and zero unordered paging.

## Ownership

All non-excluded active list APIs plus their authenticated Next.js hooks/components. CRM, Inventory, and all public landing files are excluded.

## Required list contract

- Stable tenant-scoped order with an explicit tie-breaker, usually `(created_at DESC, id DESC)`.
- Opaque cursor encodes every sort tuple component and all scope/filter dimensions necessary to reject mismatches.
- Semantic cursor validation returns HTTP 400 before SQL casts.
- `limit + 1` sentinel, hard cap, and projection discipline.
- Cursor-history Previous/Next UI; reset history when scope/filter/sort/page size changes.
- Never fetch the whole collection to compute a page. Retain `COUNT(*)` only if an actual UI element needs the full filtered count.
- Add tenant-leading/order-covering indexes only after confirming the access pattern.

## Work

- [ ] Use `offset-sunset-plan.md` and current scanner output to enumerate every remaining path.
- [ ] Migrate backend and frontend in the same change; no stranded page-number caller.
- [ ] Keep exports/streams separate when their whole-set semantics require batch processing rather than cursors.
- [ ] Add duplicate-sort-value, invalid cursor, cross-tenant cursor, filter-change, first/last page, and cursor reset tests.
- [ ] Remove redundant count queries and offset DTO fields/hooks/components when no longer used.

## Exit criteria

- [ ] `check:unbounded-reads` reports `offset pagination: 0` actionable and `unordered paging: 0`.
- [ ] All active frontend callers use the new contract.
- [ ] OpenAPI/client contract checks and both typechecks pass.

## Required commands

```powershell
pnpm -C backend check:unbounded-reads
pnpm -C backend check:openapi-coverage
pnpm -C backend typecheck
pnpm -C frontend type-check
```
