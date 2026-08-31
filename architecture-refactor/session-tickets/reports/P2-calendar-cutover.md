# P2 Calendar Cutover — Session Report

## Summary

**PART 1 — ATTENDEE/ACTOR CUTOVER**

### event_attendees.user_id — DROPPED (migration 0721)

The `event_attendees` table carried a denormalized `user_id` column alongside the canonical `membership_id`. All writers and readers have been updated to go through `membership_id` exclusively. The contract migration drops the column.

**Files updated (remove eventAttendees.userId):**
- `backend/src/db/schema/common/calendar-events.ts` — removed `userId` from `eventAttendees` table def, removed `fk_event_attendees_org_user` FK, removed `user` relation from `eventAttendeesRelations`
- `backend/src/modules/calendar/calendar.service.ts` — removed `userId` from three INSERTs (createEvent, updateAttendeesInTx, rsvp); updated `updateAttendeesInTx` SELECT to join `organizationMembers`; rewrote `listAttendees` from relational query to explicit SELECT + JOIN
- `backend/src/modules/calendar/calendar-conflict.service.ts` — replaced `eq(eventAttendees.userId, userId)` with `eq(eventAttendees.membershipId, callerMembershipId)` after resolving membership
- `backend/src/modules/calendar/calendar-reminder-sweep.service.ts` — changed SELECT to `organizationMembers.userId` (join was already present)
- `backend/src/modules/notifications/time-sweeps/notification-time-sweeps.service.ts` — added `organizationMembers` import; rewrote attendee SELECT to join via `membershipId`
- `backend/src/modules/ai/core/services/meetings-prep.service.ts` — added `organizationMembers` import; rewrote attendee SELECT to join via `membershipId`; added `orgId` scope to WHERE
- `backend/src/modules/chat/chat-huddles.service.ts` — removed `userId` from eventAttendees INSERT
- `backend/src/modules/hr/interviews/hr-interview-booking.service.ts` — removed `userId` from eventAttendees INSERT
- `backend/src/modules/hr/interviews/hr-interview-scheduling.service.ts` — removed `userId` from eventAttendees INSERT

**Migration:** `0721_calendar_attendee_user_id_contract.sql` (journal idx 543, when 1798000043000)
- Guard DO block verifies zero attendee rows have an orphaned `membership_id`
- `ALTER TABLE "event_attendees" DROP COLUMN IF EXISTS "user_id"`
- `check:migration-discipline PASSED` — 428 files, 0 violations

---

### calendar_events.created_by — DEFERRED DROP

The `created_by_membership_id` column is NOT NULL in the DB (set in migration 0658) and the Drizzle schema has been updated to reflect `notNull()`. The FK constraint for `(org_id, created_by_membership_id)` → `organization_members(org_id, id)` has been added to the Drizzle schema (was already live in DB from 0658).

All calendar module internals have been updated to use `createdByMembershipId` (calendar.service.ts, calendar-conflict.service.ts, calendar-event-source.loader.ts).

**CANNOT DROP `calendar_events.created_by` yet:**
`dashboard-personal.service.ts` (P1 territory) still reads `calendarEvents.createdBy`. Also `hr-interviewers.service.ts` and `notification-time-sweeps.service.ts` still read `createdBy` for user-id comparisons (these can be updated once P1 clears the `dashboard-personal` dependency). A drop migration must not be written until every reader is updated.

---

## PART 2 — DURABLE REMINDER EDGE CASES

### void after handler — NOT FOUND in reminder sweep
`CalendarReminderSweepService.run()` uses `forEachOrg` with full `await`. Each org runs in `withTenant` / `runWithTenantContext`. No fire-and-forget pattern in the sweep path.

Note: `hr-interview-booking.service.ts` has `void this.notifyCreator(...).catch(() => undefined)` inside a transaction callback (unrelated to the reminder sweep). Not in scope for P2.

### JS Date in Drizzle sql template — NOT FOUND
`notification-time-sweeps.service.ts` uses `sql\`now() + interval '30 minutes'\`` — SQL function, not a JS Date in a template. Safe.

### Composite FK microsecond truncation — NOT FOUND in reminder path
The reminder dedupeKey is a TEXT field (`calendar:reminder:<id>:<iso>`). No FK between `notification_outbox` and `calendar_events` on `created_at`. No microsecond truncation risk.

### Retry double-sends — CORRECT
`notification_outbox` has four states (`PENDING`, `IN_FLIGHT`, `PROCESSED`, `DEAD`) and a `processedAt` column. The reminder sweep uses `onConflictDoNothing` with `(orgId, dedupeKey)`. ✓

### Timezone / DST / all-day — CORRECT
All-day events are filtered by `eq(calendarEvents.allDay, false)`. DST correctness is tested in `calendar-reminder-sweep-recurring.spec.ts` with spring-forward, fall-back, and Asia/Kolkata cases.

### Recurring events — CORRECT
`expandToOccurrences` handles RRULE expansion. Occurrence dedupeKey includes occurrence ISO start. Cancelled occurrences are skipped via exception table lookup.

### Event deleted after scheduling — BUG FIXED
`deleteEvent` did not mark pending reminders as DEAD. Fixed: `deleteEvent` now wraps the delete in a transaction, resolves `createdByMembershipId` ownership, and issues:
```sql
UPDATE notification_outbox SET state = 'DEAD'
WHERE org_id = ? AND state = 'PENDING' AND dedupe_key LIKE 'calendar:reminder:<id>:%'
```
This matches the pattern already used in `updateEvent` for time changes.

---

## Files Changed

- `backend/src/db/schema/common/calendar-events.ts`
- `backend/src/modules/calendar/calendar.service.ts`
- `backend/src/modules/calendar/calendar-conflict.service.ts`
- `backend/src/modules/calendar/calendar-event-source.loader.ts`
- `backend/src/modules/calendar/calendar-reminder-sweep.service.ts`
- `backend/src/modules/notifications/time-sweeps/notification-time-sweeps.service.ts`
- `backend/src/modules/ai/core/services/meetings-prep.service.ts`
- `backend/src/modules/chat/chat-huddles.service.ts`
- `backend/src/modules/hr/interviews/hr-interview-booking.service.ts`
- `backend/src/modules/hr/interviews/hr-interview-scheduling.service.ts`
- `backend/migrations/0721_calendar_attendee_user_id_contract.sql` (new)
- `backend/migrations/meta/_journal.json` (idx 543 added)

## Deferred

- `calendar_events.created_by` DROP: blocked by `dashboard-personal.service.ts` (P1 territory). All other readers have been updated to use `createdByMembershipId`.
