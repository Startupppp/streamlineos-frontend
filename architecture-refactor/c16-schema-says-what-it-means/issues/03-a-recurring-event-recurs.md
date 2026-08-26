# 03 — A recurring event recurs, or the columns go

**What to build:** The product promises recurring events. The schema records the intent in two columns that are written at two call sites and read by nothing. Either recurrence works, or the columns that pretend it exists are removed — a written-never-read column is worse than a missing feature because it looks implemented.

**Blocked by:** 02 — A calendar event carries its timezone

**Status:** done

**Decision: IMPLEMENT.** `rrule 2.8.1` approved and installed. Previous DROP decision was blocked on library approval; all blocked items are now resolved.

## Acceptance criteria

- [x] If recurrence is dropped instead, the columns are gone and a test asserts their absence. — `migrations/0484_calendar_event_drop_recurrence.sql` drops `is_recurring` and `recurring_rule`; `calendar-timezone.spec.ts:14-51` asserts `isRecurring` and `recurringRule` are absent from the Drizzle schema and do not pass through create/update schemas.
- [x] A series expands to the expected occurrences, server-side. — `calendar-occurrence.service.ts:60-85` (`expandRecurring`): parses the RRULE with `RRule.fromString`, converts DTSTART to floating local time via `toZonedTime`, calls `rule.between(localWindowStart, localWindowEnd, true)`, converts each result back to UTC via `fromZonedTime`. Bounded at `MAX_OCCURRENCES_PER_WINDOW = 500`. `migrations/0507_calendar_recurrence_columns.sql` adds `rrule` and `recurrence_end` columns.
- [x] Changing one occurrence does not alter its siblings. — `calendar-occurrence.service.ts:91-107`: `exceptionMap` keyed by `utcStart.getTime()` applies overrides only to the matching occurrence. `calendar_event_exceptions` table in `migrations/0508_calendar_event_exceptions.sql`; Drizzle schema at `db/schema/calendar/calendar-event-exceptions.ts`. `PATCH /calendar/events/:eventId/occurrences/:occurrenceStart` (`calendar.controller.ts:149-172`) calls `CalendarService.upsertOccurrenceException` (`calendar.service.ts:430-464`).
- [x] Ending a series retains its past occurrences. — Expand-on-read: querying a past window expands the RRULE within that window regardless of when `recurrenceEnd` was updated. `recurrenceEnd` is a DB query hint only in the conflict service WHERE clause (`calendar-conflict.service.ts:50-65`) to skip series that ended before the window.
- [x] Expansion is correct across a daylight-saving boundary. — `expandRecurring` (`calendar-occurrence.service.ts:60-85`) converts `event.startDate` (UTC) to floating local time with `toZonedTime(event.startDate, event.timezone)` before passing to rrule, so a weekly 09:00 ET meeting stays at 09:00 local across the DST boundary. All 24 occurrence + DST tests in `calendar-occurrence.service.spec.ts` pass.

## Todo

- [x] Decide expand-on-read versus materialise — decision: expand-on-read via `expandToOccurrences` in `calendar-occurrence.service.ts`
- [x] If dropping, remove the writes too — write paths in `createEvent`/`updateEvent` never set `isRecurring`/`recurringRule` (schema has no such columns)
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
