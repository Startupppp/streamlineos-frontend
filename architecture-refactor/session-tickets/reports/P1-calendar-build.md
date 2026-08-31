# P1 — Calendar Visibility & Build Dashboard Audit

Date: 2026-08-31

---

## Defect 1 — Home Calendar Visibility Leak

### Claim being verified

Session ticket asserts the leak is fixed: `dashboard-personal.service.ts` lines ~158–191 apply a SQL visibility predicate, pinned by `dashboard-personal-visibility.spec.ts`.

### Finding: CLAIM IS TRUE. Fix is real and bites.

**Column exists.** `backend/src/db/schema/common/calendar-events.ts` line 18:
```
visibility: text("visibility").notNull().default("org"),
```
The column is NOT NULL, default `"org"`. No runtime column-not-found error is possible.

**Migration is in the journal.** `backend/migrations/0664_calendar_events_visibility.sql`:
```sql
SET lock_timeout = '5s';
--> statement-breakpoint
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'org';
```
`_journal.json` entry 382: tag `0664_calendar_events_visibility`, `breakpoints: true`. The migration applies on `db:migrate`.

**Predicate is in the WHERE clause, before projection.** `dashboard-personal.service.ts` lines 156–189:
```
.where(
  and(
    eq(calendarEvents.orgId, orgId),      ← tenant
    gte(calendarEvents.startDate, now),   ← time bound
    or(
      eq(calendarEvents.visibility, "org"),
      eq(calendarEvents.createdBy, userId),
      exists(<attendee subquery>),
    ),
  ),
)
.orderBy(calendarEvents.startDate)
.limit(3)
```
The select list (`id, title, startDate, endDate, category`) is projected AFTER the WHERE. No post-filtering.

**Spec bites.** `backend/src/modules/dashboard/dashboard-personal-visibility.spec.ts` — 11 tests across 3 describe blocks.

- Inner EXISTS subquery (5 tests): conditions are serialized with `PgDialect.sqlToQuery` (not `JSON.stringify`). Removing `ne(eventAttendees.status, "declined")` fails SCENARIO 2 (`params` would lack `"declined"`). Removing `eq(organizationMembers.status, "ACTIVE")` fails SCENARIO 3 (`params` would lack `"ACTIVE"`).
- Outer upcomingEvents WHERE (3 tests): `hasColumnNamed(outerCond, "visibility")` walks the real Drizzle column AST. Removing `eq(calendarEvents.visibility, "org")` from the outer `or()` makes the `"visibility"` column node disappear from the tree; the test returns false and fails.
- Schema column assertions (3 tests): verify the Drizzle table objects export `visibility`, `createdBy`, `status` — deleting a column from the schema would fail these without touching the service.

Capture order verified: modules.build/timesheets/hr are suppressed via `moduleAvailability → { available: false }`, so the inner EXISTS subquery `.where()` fires first (captured[0]), then the outer calendar `.where()` (captured[1]), then notifications (captured[2]).

**Other call sites checked.** `CalendarEventSourceLoader.queryVisibleEvents()` (`calendar-event-source.loader.ts` lines 104–117) — used by the full calendar page — also carries a visibility predicate:
```
or(
  eq(calendarEvents.visibility, "org"),
  eq(calendarEvents.createdBy, userId),
  isNotNull(callerAtt.id),        ← left-joined on callerMembershipId
)
```
Different from the Home predicate: it uses `isNotNull(callerAtt.id)` and does not explicitly exclude `status = "declined"` attendees (a declined attendee's row still appears on their full calendar, which is arguably intentional). The caller's `callerMembershipId` is derived by checking `organizationMembers.status = "ACTIVE"` first (lines 20–27), so an inactive member gets `callerMembershipId = 0` which never matches a real attendee row. Acceptable for the calendar page.

No other service file reads `calendarEvents` for a Home or dashboard context without a visibility predicate.

**Verdict: the fix is genuine, the column exists in both schema and migration, the predicate filters before projection, and 11 spec assertions would catch regressions.**

---

## Defect 2 — Build Dashboard Scope and Tenant-Query Defects

Files audited:
- `backend/src/modules/dashboard/dashboard-project.service.ts`
- `backend/src/modules/dashboard/dashboard-stats.service.ts`
- `backend/src/modules/dashboard/dashboard-scope.ts`
- `backend/src/modules/dashboard/dashboard.controller.ts`

### Finding A — scope "none" is not short-circuited (REAL DEFECT)

`dashboard-project.service.ts` resolves `resolveBuildDashboardScope` for `getRecentProjects`, `getActiveSprintSummary`, and `getRecentActivity`. The function returns `DataScope` which can be `"all"`, `"own"`, `"team"`, or `"none"`.

All three methods branch on `scope === "all"` for the wide path and fall through to the narrow path for everything else — including `"none"`. A user whose `build:manage` scope resolves to `"none"` still has their project memberships queried and their results returned.

Example — `getRecentActivity`:
```typescript
const scope = await resolveBuildDashboardScope(this.access, u);
const projectIds = await this.resolveProjectIds(orgId, u.userId, scope === "all");
if (projectIds.length === 0) return [];   // ← only guard
```

If the user IS a member of one or more projects despite having `"none"` scope, `projectIds.length > 0` and the query runs. A user with `build:tickets:view` (which gates the `GET /dashboard/recent-activity` route via `PermissionGuard`) but `build:manage` scope "none" still receives recent-activity results.

The spec (`dashboard-project.service.spec.ts` line 122–127) tests the empty-projectId path for `"own"` scope but never tests scope `"none"` with a populated project-member list. The gate does not bite for this case.

**Fix required:** add `if (scope === "none") return []` (or `return null` for `getActiveSprintSummary`) immediately after `resolveBuildDashboardScope` in all three methods.

### Finding B — denied stats sections execute their queries (DESIGN DEFECT)

`dashboard-stats.service.ts` `getDashboardStats()`:

```typescript
const full = await this.cache.cachedForOrg(orgId, statsKey, async () => {
  // ALWAYS runs: memberCount, projectCount, attendanceCount
}, CACHE_TTL.SHORT);

return {
  totalEmployees: flags.employees ? full.totalEmployees : null,  ← null in response
  presentToday:   flags.attendance ? full.presentToday : null,
  activeProjects: flags.projects   ? full.activeProjects : null,
};
```

The three queries execute inside the cache callback regardless of the requesting user's permissions. The cache is keyed per org, not per user, so any user warming the org cache causes all three queries to run — including users who hold none of the required permissions (`hr:employees:view`, `hr:attendance:view`, `build:tickets:view`).

The denied section values are not returned in the response, so there is no data leak to the caller. However, the rule "a denied section must not execute its query" is technically violated. The aggregate counts are not sensitive records, and the current pattern is a standard shared-cache approach. Flagged as a design concern rather than a security defect.

**If strict compliance is required:** move the flag checks inside the cache callback and skip the respective queries; introduce per-flag cache segments.

### Finding C — `resolveProjectIds` for "all" scope fetches all project IDs into JS

```typescript
const allProjects = await this.db.query.projects.findMany({
  where: and(eq(projects.orgId, orgId), isNull(projects.deletedAt)),
  columns: { id: true },   // ← IDs only
});
return allProjects.map((p) => p.id);
```

Then uses `inArray(sprints.projectId, projectIds)`. The fetch is ID-only (not full records), so this is not a "count in JavaScript over full fetch" violation. For large organisations the IN clause could be wide, but this is a performance concern, not a correctness defect.

### Finding D — unprojected users relation absent

All `with` clauses in `dashboard-project.service.ts` carry explicit column projections:
- `manager: { columns: { id, name, firstName, lastName, image } }`
- `assignee: { columns: { id, firstName, lastName, image } }`

No raw user rows leak auth secrets or HR fields. Compliant.

### Finding E — orgId predicate present on every query

Every Drizzle query in both services carries `eq(<table>.orgId, orgId)` or `eq(<table>.orgId, u.orgId)`. No cross-tenant read path found.

---

## Summary

| Item | Status | File:line |
|---|---|---|
| `calendar_events.visibility` column exists in schema | CONFIRMED | `db/schema/common/calendar-events.ts:18` |
| Migration 0664 in journal | CONFIRMED | `migrations/meta/_journal.json` entry 382 |
| Predicate in WHERE, before projection | CONFIRMED | `dashboard-personal.service.ts:156–189` |
| Spec bites — 11 tests | CONFIRMED | `dashboard-personal-visibility.spec.ts` |
| No uncovered Home call site | CONFIRMED | only `CalendarEventSourceLoader` for calendar page, which also has predicate |
| scope "none" not short-circuited in Build dashboard | **REAL DEFECT** | `dashboard-project.service.ts:37,112,186` |
| Denied stats queries still execute via shared cache | DESIGN CONCERN | `dashboard-stats.service.ts:36–79` |
| Missing orgId predicate | NOT FOUND | all queries tenant-scoped |
| JS aggregation over full record fetch | NOT FOUND | ID-only fetch |
| Unprojected users relation | NOT FOUND | all projections explicit |
