# S3 — Authorization cannot be omitted

**You are executing this session.** Read this whole file, then start. The user is not watching and
cannot answer questions — proceed on reversible decisions and record them. Read `CLAUDE.md` and
`backend/CLAUDE.md` before your first edit.

Repo: `D:\projects\personal\Streamlineos`. Branch `main`, existing checkout. **No worktree, no new
branch.** Four other sessions are running in parallel.

---

## Your 3 tickets — 13 open boxes

| # | File | Boxes |
|---|---|---|
| c25-01 | `architecture-refactor/c25-authorization-cannot-be-omitted/issues/01-every-route-declares-exposure.md` | 2 |
| c25-02 | `.../issues/02-object-access-and-scope-share-one-query-seam.md` | 8 |
| c25-03 | `.../issues/03-authorization-matrix-fails-closed.md` | 3 |

Read each in full, plus the candidate's `prd.md` and `README.md`.
**Order:** c25-03 → c25-01 → c25-02 (02 is the largest and benefits from the other two landing).

**c25-04 is NOT yours** — both its boxes need a live ephemeral database wired into CI, which does
not exist. Leave it alone.

## Where this already stands — read before building

Substantial work has landed. `backend/CLAUDE.md` §2 now documents the invariant: **every route
declares its exposure in one of exactly four ways** — `@Public()`, `@Universal()`,
`@RequirePermission(...)`, or `@AuthorizedInService("<what checks it>")`. `RouteClassifierGuard` is
the first global `APP_GUARD`. The recorded count is **3,508 handlers — 202 public, 3,165
permissioned, 33 in-service, 1 universal, 107 undeclared**.

**Enforcement is deliberately off** behind `REQUIRE_ROUTE_CLASSIFICATION=true`. Flip it only when
`pnpm check:route-classification` reaches zero, or platform core 403s. c25-01's remaining work is
classifying those 107 with evidence, one by one — **never a bulk allowlist**.

`pnpm check:permission-keys` exists with a self-test. Verify what it already covers before building
more of c25-03.

## Two premises to reject up front

- **The frontend `PERMISSIONS` array being a subset of the backend catalog is intentional and
  already tested.** The ~206-key difference is not drift. Do not raise it, do not "fix" it.
- **`PermissionGuard` is NOT a global `APP_GUARD`.** The globals are `RouteClassifierGuard`,
  `JwtAuthGuard`, `MfaGuard`, `ModuleGuard`. A route without `@UseGuards(JwtAuthGuard,
  PermissionGuard)` is authenticated and module-gated but **not permission-checked**. Assuming
  otherwise produces a fix that lands inert.

Also: **making a route universal means moving the guard, not deleting the key.** `PermissionGuard`
*denies* a route it covers that carries no `@RequirePermission`, so stripping the decorator under a
class-level guard locks everyone out.

## A finding handed to you — real, and in this candidate's scope

`LeavesService.analytics` (`backend/src/modules/hr/time/leaves.service.ts:211-221`) resolves the
caller's `DataScope`, **refuses only `none`**, then calls `queryAnalytics(orgId, year)` — which takes
no scope argument and aggregates the whole organisation. An `own`- or `team`-scoped approver sees
org-wide leave analytics by department. The resolve is decorative.

Not a cache bug: the key includes the scope, so it is merely finer than its data.

**`modules/hr/**` is not your territory.** Two separable questions here: *what* an `own`-scoped
approver should see is a product decision; *whether the endpoint honours the scope it just resolved*
is not, and today the answer is no. Write the exact change to `lane-requests/s3.md` and leave the
relevant box unticked, or coordinate — do not edit `hr/` unilaterally.

---

## Territory

**You own, exclusively:**

```
backend/src/common/auth/**
backend/src/common/rbac/**
backend/src/modules/access/**
backend/src/modules/module-access/**
backend/src/modules/rbac/**          (except permissions/index.ts)
backend/src/scripts/check-route-classification.mjs, check-permission-keys.mjs
backend/CLAUDE.md                    (§2 and §5 only — the invariants you change)
backend/migrations/0570_*.sql … 0574_*.sql
```

**c25-02 names application sites outside your territory** — `modules/kb/**` (orchestrator) and any
domain service you would apply the seam to. Build the seam itself and the in-territory sites; for
each out-of-territory site, write the exact file, line and change to `lane-requests/s3.md` and leave
that box unticked with the reason.

**Never edit:** `migrations/meta/_journal.json` · `db/schema/index.ts` · `app.module.ts` ·
`modules/rbac/permissions/index.ts` · `frontend/lib/rbac/permissions/index.ts` ·
`architecture-refactor/README.md`. Request them via `lane-requests/s3.md`. **An `APP_GUARD` you
cannot register is a guard that never executes.**

---

## Traps that have already cost this program real time

- **RLS is live.** `app.current_org_id()` **raises 42501** with no tenant GUC — it does not return
  null. **Guards run before interceptors**, so a guard's own DB queries have no tenant context —
  wrap them explicitly.
- **Cross-tenant misses return 404, never 403.** A 403 on another org's id confirms the record
  exists. Reserve `ForbiddenException` for a caller inside the correct tenant lacking the permission.
- **A module owner passes `view` because they are the owner**, not because a key is named after
  their module — `assertModuleAccessPolicy` resolves both rungs through standing.
- **A key added to a module template reaches new organisations only.** `seedSystemRolesForOrg`
  grants on role *creation*, and a re-seed must not touch an existing role's grants. Any template
  change needs a backfill migration or it is inert everywhere that already exists — see `0436`.
- **Platform billing is never delegated:** `assertPermissionsGrantable` refuses the whole `billing:`
  namespace on every path, including the org owner's own. Do not add billing to `MODULE_CATALOG`.
- **A tenant table with no RLS policy is readable org-wide** — grants arrive via
  `ALTER DEFAULT PRIVILEGES`, so a missing policy is silent.
- **A `db.transaction` mock must invoke its callback, and its tx needs `execute()`.**
- **`*.e2e-spec.ts` is in `testPathIgnorePatterns`** — those RBAC route tables are **not** executed
  coverage. Never cite them as passing.
- **Typecheck needs `NODE_OPTIONS=--max-old-space-size=8192`.**
- **Do not rewrite a test to accommodate a change.** Some existing tests assert the vulnerability.
- Estimates here skew high in one direction — 487 → 2, "13 pages" → 0. Classify, do not count.

---

## Definition of done

**Update a ticket only when the work is complete and tested.**

1. **Tick a `- [ ]` only when you can name the file and line that satisfies it**, written into the
   box's own line. Unsatisfied boxes stay unticked with the blocker written in. **Never delete or
   reword a criterion.**
2. `NODE_OPTIONS=--max-old-space-size=8192 pnpm -C backend exec tsc --noEmit` — clean.
3. **Run the specs you added or changed, scoped by path.** Authorised for this session, overriding
   the standing "never run tests" rule. Not the full suite. Report exact pass/fail counts; never
   report a suite as passing that you did not run.
4. Only at **zero** `- [ ]`: set `**Status:**` to `done` and update the row in
   `c25-authorization-cannot-be-omitted/README.md`. **Do not touch `architecture-refactor/README.md`.**
5. **Never delete a ticket file.**

## Git

You may `commit` verified work on `main`, one commit per ticket. **Never push, checkout, branch,
merge, pull, fetch, reset, stash, rebase, or create a worktree.** Subagents run no git.

The index is **shared with four sessions**. `git add` by explicit pathspec — never `-A` or `.` — and
prefer `git commit -- <paths>`, which takes only those paths regardless of what else is staged.
Re-check `git status --short` after staging. `backend/` is a separate git repo from the root.

## Report

Per ticket: Findings · Root cause · Solution · Files changed · Validation (typecheck, exact spec
counts) · anything left open with its blocker · the contents of `lane-requests/s3.md`. State the
undeclared-handler count before and after, and whether `REQUIRE_ROUTE_CLASSIFICATION` can yet be
flipped.
