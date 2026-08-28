# 02: Make Home HR sections scope-safe and cache-safe

**What to build:** Home attendance, availability and leave sections return only records allowed by the caller's DataScope and cannot reuse another member's broader cached result.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Every affected Home query receives the actor and applies the owning HR scope predicate in SQL.
- [x] Cache identity includes organization, membership, permission version, scope and relevant date/filter dimensions.
- [x] Own/team/all and cross-organization tests prove both query and cache isolation.
- [x] Home preserves independent loading/failure behavior without introducing domain writes.

## Finding

Three Home sections took `orgId` only, applied no scope predicate, and cached the whole organization's rows under an org-wide key:

- `getTeamAvailability(orgId)` — key `dashboard:team-availability:${orgId}`, returned every member's attendance.
- `getTeamAttendance(orgId)` — key `dashboard:team-attendance:${orgId}:${today}`, same.
- `getLeavesToday(orgId)` — uncached but unscoped; every approved leave in the org.

Any holder of `hr:attendance:view` / `hr:leaves:view` read the entire organization, and the first caller's result was served to every later caller regardless of scope. `getDashboardStats` also counted `users.is_active` without checking `organization_members.status`, so it counted people who had left.

`getPendingApprovals` was already correct and was used as the model.

## Decision fixed at start

`hr:attendance:view` and `hr:leaves:view` are **not scopable** in the catalog; only `hr:attendance:manage` and `hr:leaves:approve` are. Home therefore resolves the scopable key's DataScope and falls back to `own`, per root CLAUDE.md §5. Approved narrowing: a `:view`-only holder now sees their own records on Home instead of the whole organization.

## Change

`src/modules/dashboard/dashboard-cache-key.ts` (new) — `buildScopedDashboardCacheKey` emits `dashboard-home:<org>:u<user>:v<permissionVersion>:<resource>:<scope>[:<dimension>]`; `buildOrgDashboardCacheKey` is the org-wide, still version-carrying form. `u.userId` is the membership dimension deliberately: it is already on the request principal, so it costs no extra `organization_members` round trip on a hot path.

`dashboard-hr.service.ts` — `getTeamAttendance(u)` / `getTeamAvailability(u)` resolve `resolveAttendanceReadScope`, return `[]` for `none` without touching the DB, and push `applyScope(scope, orgId, userId, { ownerColumn: attendance.userId })` into the `WHERE`. `buildTeamAttendance`'s total and `getDashboardStats`'s `totalEmployees` now count `organization_members.status = 'ACTIVE'`. `getBirthdays` and `getDashboardStats` moved onto version-aware keys.

`dashboard-leave.service.ts` — `getLeavesToday(u)` resolves `resolveLeavesViewScope`, falls back to `own`, and filters with `applyScope(..., { ownerColumn: leaveRequests.userId })`. **This is a roster read, so it filters by whose leave it is.** The first implementation used `leaveApprovalScope`, which filters by `approver_id` — correct for the pending-approvals counter it was written for, wrong here: under `team` it would have shown only leaves the caller approves rather than their teammates' leave. `getUpcomingHolidays` moved onto a version-aware key.

`dashboard.controller.ts` — the three handlers pass `u`. No `@RequirePermission` or `@RequireModule` changed.

## Verification

`node ./node_modules/jest/bin/jest.js src/modules/dashboard/dashboard-home-scope.spec.ts --maxWorkers=1`

```
Tests: 21 passed, 21 total
  √ (e) is a roster read, so it filters by whose leave it is, not by who approves it
  √ (e) a viewer holding no approval scope collapses to own, never to the whole org
  √ (b) different scopes for same actor in same org produce different keys
  √ (b) different actors in same org with same scope produce different keys
  √ (c) same actor in different orgs produces different keys
  √ (d) permission version bump changes the scoped cache key
```

Predicates are compared by rendering them with `PgDialect.sqlToQuery` — `JSON.stringify` on a drizzle condition throws, since the objects are circular. The roster-vs-approver test asserts the two predicates differ and name different columns, so the two helpers cannot be swapped back silently.

`resignation-approval-scope.spec.ts` re-runs green (10 tests).

## Note

`GET /dashboard/team-availability` has **no frontend consumer** — `dashboard-client.tsx` derives `teamAvailability` client-side from `teamAttendance.records`. It was fixed rather than deleted; deletion needs the module-graph proof in ticket 37.
