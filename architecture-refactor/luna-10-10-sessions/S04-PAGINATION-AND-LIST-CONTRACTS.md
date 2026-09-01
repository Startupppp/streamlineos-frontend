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

- [x] Use `offset-sunset-plan.md` and current scanner output to enumerate every remaining path.
- [x] Migrate backend and frontend in the same change; no stranded page-number caller in the active non-excluded list contracts.
- [x] Keep exports/streams separate when their whole-set semantics require batch processing rather than cursors.
- [x] Add duplicate-sort-value, invalid cursor, cross-tenant cursor, filter-change, first/last page, and cursor reset tests.
- [x] Remove redundant count queries and offset DTO fields/hooks/components when no longer used.

## Exit criteria

- [x] `check:unbounded-reads` reports `offset pagination: 0` actionable and `unordered paging: 0`.
- [x] All active frontend callers use the new contract; CRM, Inventory, public landing, KB search, and portal handoffs remain outside this session's active ownership.
- [x] OpenAPI/client contract checks and both typechecks pass.

## Execution record — 2026-09-01

- [x] Parallel backend/frontend migration lanes completed the actionable non-excluded list contracts, including HR, payroll, users, RBAC, delegations, ownership, webhooks, build, billing, organization, API tokens, portal access, and public KB service contracts.
- [x] Cursor pages use stable sort plus a tie-breaker, `limit + 1` sentinel reads, capped limits, and no count query unless required by a separate UI contract.
- [x] Cursor history controls reset on scope/filter/page-size changes across migrated authenticated callers.
- [x] Focused pagination coverage includes sentinel boundaries, malformed/semantic cursor validation, tenant isolation, duplicate sort values, and frontend cursor reset/history behavior.

Evidence:

- `pnpm -C backend check:unbounded-reads`: offset pagination `0` actionable; unordered paging `0`.
- `pnpm -C backend check:openapi-coverage`: 3,579/3,579 operations covered.
- Backend typecheck passed with the direct TypeScript invocation using a 4 GiB heap; the package wrapper later hit the host allocation limit without diagnostics.
- `pnpm -C frontend type-check`: passed.
- Checkpoint commits: `4f5b5ba6b`, `5d959751b`, `9fc35be3d`, `d94ed7379`.

## Required commands

```powershell
pnpm -C backend check:unbounded-reads
pnpm -C backend check:openapi-coverage
pnpm -C backend typecheck
pnpm -C frontend type-check
```
