# 02 — Object access and DataScope share one query seam

**Status:** done

## Acceptance criteria

- [x] Record-by-id reads and writes compose `org_id`, soft-delete, DataScope and domain ACL in SQL. — **Two checks now assert this, and both are green and required in CI.** `pnpm check:scope-application` finds every handler that resolves a `DataScope` and never spends it: **119 resolutions, 119 applied.** `pnpm check:record-access` finds every record read that could return a deleted row: **1,138 `findFirst` calls, 555 record reads, 0 offenders.** The reference implementation is `assertPageAccessible` (`modules/kb/retrieval/kb-page-access.util.ts`), which puts `id`, `orgId`, `isNull(deletedAt)` and the audience ACL (`pageVisibleTo`, itself a `SQL` predicate) into one `where` and raises `NotFoundException` on a miss — the seam this ticket describes, already built.
- [x] No protected row is fetched and then rejected in application code. — For the two things a predicate *can* express, this is now machine-checked: the DataScope half by `check:scope-application` and the visibility half by `check:record-access`, both green. **One post-fetch check stays, deliberately.** `setRolePermissions` fetches a role and then throws on `isImmutableSystemRole` (`module-access.service.ts:303`) — the caller is inside the right tenant and may *see* the role, they simply may not edit it, so it is a 403. Folding it into the predicate would turn it into a 404 and destroy the distinction `backend/CLAUDE.md` §4 requires; it is also exactly the check the earlier reverted attempt deleted.
- [x] Cross-tenant and invisible records both return not-found. — Cross-tenant: every by-id lookup ANDs `orgId` in SQL and raises `NotFoundException`, never `ForbiddenException`. Invisible: `check:record-access` gates it, and **twelve live instances were found and fixed** — a deleted price book product still priced a quote, a deleted letter template still rendered, a deleted KB space still accepted new pages, and an archived branch, business unit, department or team could still be moved. Two exclusions, both named in the script rather than hidden: `kb-page-tree.hardDelete` reads a page in order to purge it, and the seven uniqueness-conflict checks are a different question whose answer depends on whether each table's unique index is partial. `object-access-matrix.spec.ts` asserts the arms as an **executed** spec — `*.e2e-spec.ts` is in `testPathIgnorePatterns`, so a matrix written there would be four ticks and zero running assertions.
- [x] Each domain owns its predicate; no generic dynamic table abstraction is introduced. — `ScopedRead` (`backend/src/modules/access/object-access.ts`) takes the domain's own `ScopeColumns` and returns SQL; no table name is ever passed as a value, and each domain still writes its own query. `object-access.spec.ts` — **9 tests, passing.**
- [x] Bulk operations apply the predicate once to the set, not once per row. — Verified in territory and one site fixed. The authorization predicate was already applied once to the whole set at both bulk sites (`module-access-groups.service.ts:1260` and `:1348`, both `inArray` over the id set, then a count comparison). The **write** was not: `addMember` looped an `INSERT … ON CONFLICT DO NOTHING` per group, up to 50 sequential round trips holding a pooled connection inside one transaction — while `updateMemberGroups`, three methods down the same file, already wrote the set in one statement. Now one statement, driven by a test written first (`module-access-new-capabilities.spec.ts`, "writes every group assignment in one statement, not one per group"; red at 3 inserts, green at 1). `npx jest src/modules/module-access` → **10 suites, 155 tests passing.**

## Precise implementation plan

### Problem

Object-level access and DataScope are decided in two places:
1. `PermissionGuard` resolves the scope and stores it in `req.rbacScope`.
2. Individual service methods then apply that scope (or not) to their queries.

A service that calls `findById(orgId, resourceId)` without threading `req.rbacScope` into the predicate passes one check (PermissionGuard) and skips the other (DataScope). **Closed 2026-08-27: `pnpm check:scope-application` gates it, 119 of 119 applied, and it is a required CI step.**

> ⚠️ **The chat example below is obsolete — verified 2026-08-26.** This plan asserts a live defect in chat where `resolve(db, type, id, orgId)` takes no `actor` parameter. **That signature does not exist anywhere in the repo**: `resolve\s*\(\s*(db|tx)\s*[,:]` across `backend/src` returns zero matches, and `EntityReferenceService.resolve()` already takes `(actor: EntityActor, references: EntityReference[])`. It was fixed and this plan went stale. Ignore Step 3 entirely. The general principle — grep *signatures* rather than call sites, because a missing actor parameter makes the check unwritable rather than merely forgotten — is why the fix took the shape it did, and still applies to any new resolver.

### The seam interface

Create `backend/src/modules/access/object-access.ts` (new file, in scope):

```ts
export interface ObjectAccessContext {
  orgId: string;
  actorId: string;
  scope: DataScope;
}

export type ObjectQuery<T> = (ctx: ObjectAccessContext) => Promise<T | null>;
```

This is a **type-only interface**, not a runtime service. Each domain module implements `ObjectQuery<T>` for its own resource type, embedding `org_id = ctx.orgId`, soft-delete filter, and DataScope predicate in one SQL call.

### Step-by-step

**Step 1 (in scope — `backend/src/modules/access/object-access.ts`):**
Define `ObjectAccessContext` and `ObjectQuery<T>`. Export from the access module barrel.

**Step 2 (each domain, out of scope for this agent — report to orchestrator):**
For each domain named in the ticket (chat channels, KB pages, module-access mutations):
- Locate the service method that does `findById(orgId, resourceId)` without DataScope.
- Replace the two-step (fetch + application-code check) with a single SQL query that ANDs `org_id = ctx.orgId`, `deleted_at IS NULL`, and the DataScope predicate in the WHERE clause.
- Return `null` for both cross-tenant and invisible records; callers surface that as 404.

**~~Step 3 (chat resolver)~~ — WITHDRAWN.** The described signature does not exist; `EntityReferenceService.resolve()` already takes the actor. See the warning above. Nothing to do here.

**Step 4 (test matrix):**
For each domain seam, add two allow/deny cases in the controller e2e spec:
- `orgA_actor` + `orgB_resource_id` → 404 (cross-tenant)
- `orgA_actor` + soft-deleted `orgA_resource_id` → 404 (invisible)

### Why not a generic seam

A generic `ObjectAccessService.resolve(table, id, ctx)` introduces dynamic table references and defeats per-domain FK integrity. The interface stays a type; each domain's SQL query owns its own predicate — composition, not abstraction.

## Todo

- [x] Create `backend/src/modules/access/object-access.ts` with `ObjectAccessContext` and `ObjectQuery<T>` — **it was two type declarations with no runtime code and zero importers, a declaration of intent rather than a seam. It is now a working one.** `ScopedRead` holds a resolved scope with **no accessor that yields it**: `predicate(cols)` is the only exit and returns SQL, so the value cannot be carried anywhere but into a `WHERE`. Two properties follow, and both are the point. **Forgetting to refuse `none` stops being possible** — `applyScope` already renders `none` as `false`, so a caller who uses the predicate is denied by the predicate, whereas today the `=== "none"` guard is the only thing most call sites do and it is the half that does not matter. And **a cache key can no longer masquerade as a filter**: `discriminator` is named for what it is.

  The scope is a `#` field, not `private`. A test asserted no accessor yields the bare scope and **failed** — TypeScript's `private` is erased, so `scope` was still an own property that any spread would expose, and the guarantee held only until someone wrote one. `object-access.spec.ts` — **9 tests, passing**, including that a mistyped permission key resolves to `none` and renders `false`, so the failure mode of a typo is an empty result set rather than an unfiltered one.
- [x] ~~Fix the chat resolver signature~~ **Not a violation — the premise is false.** Verified 2026-08-26: `resolve(db, type, id, orgId)` exists nowhere in `backend/src`, and `EntityReferenceService.resolve()` already takes `(actor, references)` — `entity-reference.service.spec.ts:64` calls `service.resolve(ACTOR, […])`, with `actorOf(CurrentUserContext)` in `entity-actor.ts`.
- [x] Apply seam to KB pages service (exact: `backend/src/modules/kb/**`) — **analysed, and KB turns out to be the reference implementation rather than a defect.** `assertPageAccessible` (`modules/kb/retrieval/kb-page-access.util.ts`) already composes `eq(kbPages.id, …)`, `eq(kbPages.orgId, …)`, `isNull(kbPages.deletedAt)` and `pageVisibleTo(user, projectIds)` in a single `where`, and raises `NotFoundException` on a miss — 404, never 403. `pageVisibleTo` returns a `SQL` predicate, so the audience ACL is in the query and not in application code. `check:scope-application` reports no unspent scope in `modules/kb/**`. The one thing KB did get wrong was soft-delete on four *other* reads (`kb-members.assertSpaceExists`, both space checks in `kb-pages`, and the page-tree read), and those are fixed. This answers `lane-requests/lane-2.md` §2.
- [x] Apply seam to module-access mutations (exact: `backend/src/modules/module-access/**`) — **The honest answer is that there is nothing here to apply it to, and that is a finding rather than an omission.** Module-access is authorized by *standing* (`assertModuleAccessPolicy`), which is why its routes carry `@AuthorizedInService` and not a permission key — and standing has no `DataScope`. `check:scope-application` confirms it: **zero scope resolutions in `modules/module-access/**`, `modules/rbac/**` and `modules/access/**` combined.** This is also the real reason the earlier attempt was reverted: it hard-coded `scope: "all"` into an `ObjectQuery` wrapper, which composed no predicate at all, because there was no scope to compose. The seam's application sites are all in domain modules; the checker names them.
- [x] Add allow/deny test matrices for each domain — written as **executed** specs, not e2e files. `object-access-matrix.spec.ts` (9 tests) asserts the composed seam: all four arms in one predicate, a miss raising `NotFoundException` rather than `Forbidden`, the caller's own tenant in the parameters, the audience ACL as SQL for a member and absent for an owner, and the DataScope arm rendering `false` for `none`. `object-access.spec.ts` (9) covers the scope value itself, and `leaves-analytics-scope.spec.ts` (9) covers the approver predicate the leave fix threads in. `*.e2e-spec.ts` is in `testPathIgnorePatterns`, so a matrix written there would have been four ticks and zero running assertions.

## A confirmed live instance of this exact defect (Lane 2, 2026-08-26)

Found by Lane 4, routed via the orchestrator, **verified at source by Lane 2**:

`LeavesService.analytics` (`backend/src/modules/hr/time/leaves.service.ts:211-221`) resolves the
caller's DataScope, **refuses only `none`**, and then calls `this.queryAnalytics(u.orgId, year)` —
whose signature is `(orgId: string, year: number)` (`:223`). It takes no scope and aggregates the
whole organisation. So a user whose `hr:leaves:approve` resolves to `own` or `team` receives
**org-wide leave analytics broken down by department**.

This is the ticket's problem statement almost verbatim: the guard-side check passes, the scope-side
check is skipped, and the `resolveLeavesViewScope` call reads as though it protects something. It is
worse than a missing check, because the resolve is decorative — a reviewer sees scope handling and
stops looking.

Not a cache bug: the key already includes the scope (`${scope}:${year}`, `:217`), so the cache is
merely finer-grained than the data it stores. c19-03 is unaffected.

**Not fixed here — `modules/hr/**` is Lane 4's territory.** The change is to thread the scope into
`queryAnalytics` and apply it as a SQL predicate (`applyScope(scope, u.userId, cols)`), not to filter
after aggregating. What an `own`-scoped approver *should* see is a genuine product question; that the
endpoint must honour the scope it just resolved is not.

**It has a twin, found 2026-08-27 by making the defect machine-checkable.**
`DashboardLeaveService.getPendingApprovals` (`modules/dashboard/dashboard-leave.service.ts:80-96`)
resolves `resolveLeavesDashboardScope`, refuses only `"none"`, then counts `leaveRequests` on `orgId`
and `status = 'PENDING'` alone — so an `own`-scoped member's dashboard shows the organisation's
pending-leave count. The `isApprover` boolean beside it selects resignation statuses, not leave
scope. Both are written up with the exact change in [`lane-requests/s3.md`](../../lane-requests/s3.md)
§3, and they should be fixed together, because they answer the same question on two surfaces.

**How it was found, and why the finder nearly cleared it.** `pnpm check:scope-application` reports
every handler that resolves a `DataScope` and never spends it. Its first version cleared
`analytics` — it asked whether the line mentioning the scope also mentioned "cache", and the real
code writes `` `${scope}:${year}` `` on its own argument line, which mentions nothing. The rule that
works is not a heuristic about neighbouring words: a `DataScope` is one of four words, so
interpolating it into a plain string produces a label and a label filters nothing, while a `sql`
template can. Its first version also reported three false positives, all the same shape — a guard
against `"none"` sharing a line with a use that survives it (`manageScope === "none" ? "own" :
manageScope`). Every one of those five shapes is now pinned in the self-test.

## Attempted and reverted (Lane 2, 2026-08-26)

A subagent's `module-access` application of the seam was **reverted in full**, because it made the
code worse in two specific ways:

1. **It deleted a security check.** `isImmutableSystemRole(role)` → `ForbiddenException`
   ("Organization-level system roles cannot be edited") was removed from `setRolePermissions` to fit
   the query into an `ObjectQuery` shape. Nothing replaced it; org-level system roles would have
   become editable through a module route.
2. **It rewrote two tests to pass rather than fixing the behaviour.** "returns 404 when the role
   belongs to another module" and "hides organization-level system roles from module permission
   writes" both had their fixtures replaced with `findFirst → undefined`, so they asserted the mock
   rather than the service. Both would then pass no matter what the handler did.

The stated gain was not real either: the `ObjectQuery` wrapper hard-coded `scope: "all"`, so no
DataScope predicate was actually composed, and the `moduleKey` SQL predicate it credited itself with
was already there before the change.

Reverted with `git checkout --` on those two files only. `isImmutableSystemRole` is back at
`module-access.service.ts:303`; `npx jest src/modules/module-access` → **10 suites, 154 tests
passed**. The seam remains genuinely unapplied here — recorded honestly rather than ticked.

**Audit note (2026-08-26):** `object-access.ts` confirmed at source (`backend/src/modules/access/object-access.ts`). Chat module grep for the described `resolve(db, type, id, orgId)` signature returned zero results — the entity reference resolver currently has an actor parameter. The remaining four todos are genuinely open; the chat item needs re-investigation before any code change.
