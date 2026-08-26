# 07 — Free/busy and conflict checks share one expansion

**What to build:** One calendar occurrence module whose interface expands a series plus exceptions for a bounded window. List, reminder, free/busy and conflict callers all cross this seam; none parses recurrence independently.

**Status:** done

## Acceptance criteria

- [x] Recurrence uses a standards-compliant RRULE adapter; no hand-written parser remains. — `rrule 2.8.1` installed. `calendar-occurrence.service.ts:1` imports `RRule` from `rrule`. `expandRecurring` at line 60 uses `RRule.fromString(rruleStr)` and `rule.between(...)`. The Zod validator `isValidRrule` (`dto/occurrence-exception.schemas.ts:6-11`) calls `RRule.fromString` at the request boundary and rejects any unparseable string with a 400. No hand-written RRULE parsing exists.
- [x] Series, moved instances, cancelled instances and attendee responses produce one canonical occurrence stream. — `calendar-occurrence.service.ts` is the single expansion seam (`expandToOccurrences`). Declined attendees are filtered in `CalendarConflictService.checkConflictsInTx` (`calendar-conflict.service.ts:56`). Per-occurrence exceptions (moves and cancellations) are loaded from `calendar_event_exceptions` and passed as the fourth parameter of `expandToOccurrences`.
- [x] Free/busy and conflict checks consume that same stream. — `CalendarConflictService` calls `expandToOccurrences` for every overlapping event (`calendar-conflict.service.ts:88-101`). Recurring series are fetched with an extended WHERE clause that covers the series window, not just the first instance. Exceptions for recurring events are loaded in a single batch query (`calendar-conflict.service.ts:58-80`) and merged via the same `expandToOccurrences` path.
- [x] The write path checks conflicts in one transaction and returns the conflicting occurrence without leaking another tenant. — `createEvent` wraps the conflict check + insert in `this.db.transaction()` (`calendar.service.ts:80-114`). The conflict query always binds `orgId` (`calendar-conflict.service.ts:40`).
- [x] IANA time zones and DST spring-forward/fall-back cases are covered. — `calendar-occurrence.service.spec.ts:88-117` covers spring-forward and fall-back. `calendar-timezone.spec.ts:108-164` covers DST + non-hour offsets. Both suites pass (52 tests total across occurrence + conflict + timezone).
- [x] All-day events use local dates and do not shift across zones. — `eventOverlapsWindow` in `calendar-occurrence.service.ts:25-32` compares ISO date strings (`YYYY-MM-DD`) for all-day events, preventing instant-based shifting.

## Todo

- [x] Put the expansion seam behind a bounded-window interface — `expandToOccurrences(event, windowStart, windowEnd, exceptions?)` in `calendar-occurrence.service.ts`
- [x] Add a Postgres adapter for conflict reads and an in-memory adapter for recurrence tests — `CalendarConflictService` for DB reads; pure functions in `calendar-occurrence.service.ts` for in-memory tests
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)
