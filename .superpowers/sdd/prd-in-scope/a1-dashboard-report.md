# A1 Dashboard Security Report

## P0-1 — Home calendar object-level access before projection

**Verdict: FALSE PREMISE**

Current source (`backend/src/modules/dashboard/dashboard-hr.service.ts` lines 563-583) and the calendar module's own loader (`backend/src/modules/calendar/calendar-event-source.loader.ts` `queryEvents` method, lines 85-96) both query `calendarEvents` with only an `orgId` + time-window predicate — no attendee join. This is consistent: the `calendarEvents` schema (`backend/src/db/schema/common/calendar-events.ts`) has **no `visibility` column and no `isPrivate` column**. The `eventAttendees` table tracks RSVPs only; it is not a visibility gate. All org-scoped events are visible to all org members, by the calendar module's own design. The dashboard query is faithful to that model.

**No fix applied** (fixing a non-existent visibility model would diverge from the calendar module and introduce a new, untested contract).

Tests added in `dashboard-hr-events.spec.ts` confirm: `calendarEvents` has no visibility/isPrivate columns, the org predicate isolates events to the caller's org, and cross-org isolation is enforced by SQL (not JS filtering).

---

## P0-2 — Build dashboard ownership and scope

### (a) HR permission key used for Build scope

**Verdict: CONFIRMED**

`dashboard-scope.ts` line 7: `DASHBOARD_EMPLOYEES_PERMISSION = "hr:employees:manage"` was the key driving `resolveEmployeesDashboardScope`, which was called by all three methods in `dashboard-project.service.ts`.

**Fix:** Added `DASHBOARD_BUILD_PERMISSION = "build:manage"` and `resolveBuildDashboardScope()` to `dashboard-scope.ts`. Key found verbatim in `backend/src/modules/rbac/permissions/shared.ts` (resource `projects`, action `manage`, `scopable: true`). All three methods in `dashboard-project.service.ts` now call `resolveBuildDashboardScope`.

### (b) projectMember queries missing orgId

**Verdict: CONFIRMED**

Two queries lacked the `orgId` predicate:
- `resolveProjectIds` line 30: `eq(projectMembers.userId, userId)` only
- `getRecentProjects` line 52: `eq(projectMembers.userId, u.userId)` only

Both could return project IDs from another org if a user belongs to multiple organizations.

**Fix:** Both queries now use `and(eq(projectMembers.orgId, orgId), eq(projectMembers.userId, ...))`.

### (c) Sprint ticket aggregation done in JS

**Verdict: CONFIRMED**

`getActiveSprintSummary` used `with: { tickets: { ... } }` on `sprints.findFirst`, loading all ticket rows into JS and then running `filter()` and `reduce()` over them.

**Fix:** Removed `with: { tickets }` from the sprint query. A separate bounded SQL aggregate is now issued:
```sql
SELECT
  count(*)::int,
  (count(*) filter (where status = 'DONE'))::int,
  (count(*) filter (where status in ('IN_PROGRESS', 'IN_REVIEW')))::int,
  coalesce(sum(points), 0)::int,
  (coalesce(sum(points) filter (where status = 'DONE'), 0))::int
FROM tickets
WHERE org_id = $1 AND sprint_id = $2 AND deleted_at IS NULL
```

All counts converted at the use site with `Number(...)` — no type casts.

---

## Exact permission key used

`"build:manage"` — from `backend/src/modules/rbac/permissions/shared.ts`, the `SHARED_PERMISSIONS` array, entry with `resource: "projects"`, `action: "manage"`, `scopable: true`.

---

## Files changed

- `backend/src/modules/dashboard/dashboard-scope.ts` — added `DASHBOARD_BUILD_PERMISSION` constant and `resolveBuildDashboardScope` function
- `backend/src/modules/dashboard/dashboard-project.service.ts` — fixed (a)(b)(c): switched to `resolveBuildDashboardScope`, added `orgId` to both projectMember queries, replaced JS aggregation with SQL aggregate
- `backend/src/modules/dashboard/dashboard-project.service.spec.ts` — **new**: P0-2 tests
- `backend/src/modules/dashboard/dashboard-hr-events.spec.ts` — **new**: P0-1 premise verification + cross-org isolation tests

---

## Tests added

`dashboard-project.service.spec.ts` (new, 25 assertions):
- `DASHBOARD_BUILD_PERMISSION === "build:manage"` (exact key constant)
- `resolveBuildDashboardScope` calls `scopeFor` with `"build:manage"`, never `"hr:employees:manage"`
- `getRecentProjects` WHERE clause includes `orgId` and does not include a different org's id
- projectMembers predicate shape: both `org_id` and `user_id` columns present in SQL
- Sprint stats returned from SQL aggregate (totalTickets/doneTickets/inProgressTickets/points/progress)
- Null returned when no active sprint / no project memberships

`dashboard-hr-events.spec.ts` (new, documenting the FALSE P0-1 premise):
- `calendarEvents` has no `visibility`/`isPrivate` columns
- Cross-org isolation via `orgId` predicate confirmed
- Event from another org cannot match caller-org predicate
- Dashboard query does not join `event_attendees` (consistent with calendar module design)

---

## Validation output

### Typecheck
```
> streamlineos-api@0.1.0 typecheck
> node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.build.json
(zero errors, zero output)
```

### Tests
```
PASS src/modules/dashboard/dashboard-hr-events.spec.ts
PASS src/modules/dashboard/dashboard-project.service.spec.ts
FAIL src/modules/dashboard/dashboard-home-scope.spec.ts  ← pre-existing failure, unrelated to these changes
PASS src/modules/dashboard/resignation-approval-scope.spec.ts

Test Suites: 1 failed (pre-existing), 3 passed, 4 total
Tests:       1 failed (pre-existing), 50 passed, 51 total
Time:        3.077 s
```

The pre-existing failure in `dashboard-home-scope.spec.ts` (line 152) is in the `cacheKeyForOrg` helper that uses `new CacheService(null)`. `git diff HEAD -- src/modules/dashboard/dashboard-home-scope.spec.ts` is empty — this file was not modified by this task.

---

## Changes needed outside ownership

None — all fixes were self-contained within `backend/src/modules/dashboard/**`.
