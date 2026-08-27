# c25 — Authorization cannot be omitted

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 1** · 4 tickets, **all done**. Fully closed.

The permission resolver was already deep and the SQL scope predicates sound. The external seam was not: `PermissionGuard` is opt-in, so a new authenticated route could ship without declaring whether it was public, universal self-service or permissioned. Absence now denies, at runtime and in CI.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | Every route declares its exposure | — | **done** — 6/6; **0 undeclared routes** of 3,518, enforcement on by default, OpenAPI records each declaration |
| 02 | Object access and DataScope share one query seam | 01 | **done** — 5/5; the seam refuses to hand back the scope, 119/119 scopes applied, 12 soft-delete holes closed, bulk writes batched |
| 03 | The authorization matrix fails closed in CI | 01, 02 | **done** — 6/6; six checks green and required in CI — permission keys, route classification, navigation gates, scope application, record access, tenant indexes |
| 04 | RLS coverage is a release invariant | — | **done** — gap measured at 129, closed to 0 |

## Folded ticket digests

### 01 — Every route declares its exposure

`RouteClassifierGuard` (`backend/src/common/auth/route-classifier.guard.ts`) is wired as the first `APP_GUARD` in `app.module.ts:195` and enforces by default: absence denies at boot and at request time; only a literal `REQUIRE_ROUTE_CLASSIFICATION=false` disables it. Final counts: **3,518 handlers — 202 public, 3,175 permissioned, 94 universal, 47 in-service, 0 undeclared**. A fourth declaration `@AuthorizedInService("…")` was added (`backend/src/common/auth/authorized-in-service.decorator.ts`) for routes whose authorization lives in the service layer (e.g. module-access standing checks). OpenAPI stamping (`record-route-classification.ts`, wired in `main.ts` inside the dev-only block) derives `x-exposure` from the same metadata keys the guard reads so the document cannot drift. `pnpm check:route-classification` is a required CI step; a parser bug where prettier-wrapped `@AuthorizedInService` arguments silently moved routes to UNDECLARED was found and fixed (`collapseMultilineDecorators`).

### 02 — Object access and DataScope share one query seam

`ScopedRead` (`backend/src/modules/access/object-access.ts`) wraps a resolved scope so its only exit is `predicate(cols)` returning SQL — the bare scope value is inaccessible, making it impossible to forget. `pnpm check:scope-application` (required CI) asserts 119/119 DataScope resolutions are spent in SQL, not filtered post-fetch. `pnpm check:record-access` (required CI) asserts 0 of 555 record reads can return a deleted row; 12 soft-delete holes were closed (deleted price book product, letter template, KB space, archived hierarchy nodes). A live DataScope defect was found and handed off: `LeavesService.analytics` and `DashboardLeaveService.getPendingApprovals` each resolve a scope, refuse only `"none"`, then query the whole org — both written up in `architecture-refactor/OPEN-FINDINGS.md` §3 for the HR lane to fix together.

### 03 — The authorization matrix fails closed in CI

Six checks are required CI steps, all green: `check:permission-keys`, `check:route-classification`, `check:navigation-permissions`, `check:scope-application`, `check:record-access`, `check:tenant-indexes` (all in `backend/.github/workflows/ci.yml`). `check:permission-keys` loads the real catalog via ts-node (`dump-permission-catalog.ts`) to catch template-literal-generated keys and resolves module-level constant arguments — coverage went 3,055 → 3,085 usages, 664 → 690 catalog keys. `check:navigation-permissions` found four real drifts (accounting gates using legacy keys, `/crm/deals/approvals` wrong key, `/hr/goals` wrong key) and fixed all; 438 gates, 0 failing. `check:tenant-indexes` validates 703/703 schema tables lead their indexes with the tenant column. The `authorize()` unknown-key guarantee is FORBIDDEN for non-owners via `scopeFor` → `none`; org owners are allowed by design, pinned in `authorize.spec.ts` (25 tests).

### 04 — RLS coverage is a release invariant

`backend/src/scripts/db-verify-rls.mjs` exits non-zero (`process.exit(failures === 0 ? 0 : 1)` at line 307) when any organisation-owned table lacks enabled and forced RLS or the expected tenant predicate. Runs as a non-bypass probe role. `PLATFORM_GLOBAL_TABLES` (lines 43–48) requires per-entry rationale; absence is a gap, not global-by-default. Wired in `backend/.github/workflows/ci.yml:90`. The previously-unknown RLS gap was **129 tables** (80 accounting/GL/tax, 49 notifications); migrations `0591` and `0592` closed it to 0. An unresolved contradiction is recorded for a policy ruling: `backend/CLAUDE.md` §4 says never blanket-FORCE; the verifier fails every non-forced table — both cannot be right, and FORCE is currently a no-op anyway because `neondb_owner` carries `BYPASSRLS`.

## Working these

Work the frontier. Each ticket is a vertical slice and must preserve the universal employee surfaces documented in `CLAUDE.md`.
