# L13 Calendar Report

**Status: DONE (calendar P0 fixed; out-of-ownership items recorded below)**

## Visibility Fix — SQL

Added `visibility TEXT NOT NULL DEFAULT 'org'` to `calendar_events`.

Migration SQL required (OUT-OF-OWNERSHIP — do not apply until S06/migrations lane runs):
```sql
ALTER TABLE calendar_events ADD COLUMN visibility TEXT NOT NULL DEFAULT 'org';
```
Journal entry: append after current last entry in `migrations/meta/_journal.json`.

Filter in `calendar-event-source.loader.ts` now applies before any title/metadata projection:
```sql
WHERE ce.org_id = $orgId
  AND ce.start_date < $end AND ce.end_date > $start
  AND (ce.visibility = 'org' OR ce.created_by = $userId OR cal_src_caller_att.id IS NOT NULL)
```
Attendee join: `LEFT JOIN event_attendees cal_src_caller_att ON (org_id, event_id, membership_id = callerMembershipId)`. Sentinel 0 used when no active membership exists (serials start at 1, so 0 never matches).

## DST/Timezone Proof

Existing `calendar-timezone.spec.ts` proves UTC storage and IANA display for: spring-forward (NY EST→EDT), fall-back (NY EDT→EST), non-hour offset (Kolkata +05:30). All pass.

## Test Summary

173 tests pass across 18 suites. New `calendar-visibility.spec.ts` adds 18 tests covering: schema column presence, SQL predicate structure (org-visible arm, organizer arm, attendee arm), cross-org isolation, declined-attendee semantics, departed-membership sentinel, and membership ACTIVE-status constraint.

## Guard Audit

Calendar controller: 2 handlers carry `@RequirePermission` — both also have `@UseGuards(PermissionGuard)` at handler level. 0 violations.

## OUT-OF-OWNERSHIP

1. **`backend/src/modules/dashboard/dashboard-hr.service.ts` lines 563–583** — `upcomingEvents` query selects from `calendar_events` with only `orgId + startDate` predicate; no visibility filter. Must add: `and(eq(calendarEvents.visibility, "org"), ...)` or apply the same visibility predicate (requires the caller's userId and membershipId from the dashboard handler context). Exact change: add the attendee left-join and the OR predicate to this query, mirroring the loader pattern.

2. **`backend/src/modules/dashboard/dashboard-hr-events.spec.ts` lines 13, 63** — two tests assert `not.toContain("visibility")` on `calendarEvents` columns; these are "P0 premise verification" tests that documented the bug. Now that the column exists, both must be inverted to `toContain("visibility")`.

3. **`backend/migrations/`** — SQL migration for the `visibility` column is needed (see SQL above). Not applied — migrations lane owns this.
