# 03 — A recurring event recurs, or the columns go

**What to build:** The product promises recurring events. The schema records the intent in two columns that are written at two call sites and read by nothing. Either recurrence works, or the columns that pretend it exists are removed — a written-never-read column is worse than a missing feature because it looks implemented.

**Blocked by:** 02 — A calendar event carries its timezone

**Status:** done

**Decision: DROP.** No RRULE library (`rrule` or equivalent RFC 5545 package) is installed in `backend/package.json`. Adding one is a dependency decision for the operator; it cannot be done here without a blocking approval. The drop path fully satisfies the acceptance criteria: columns that are written and never read are worse than a missing feature.

## Acceptance criteria

- [x] If recurrence is dropped instead, the columns are gone and a test asserts their absence. — `migrations/0484_calendar_event_drop_recurrence.sql` drops `is_recurring` and `recurring_rule`; `calendar-timezone.spec.ts:14-51` asserts `isRecurring` and `recurringRule` are absent from the Drizzle schema and do not pass through create/update schemas.
- [ ] A series expands to the expected occurrences, server-side. — BLOCKED: no RRULE library installed. `calendar-occurrence.service.ts` provides the bounded expansion seam; a series would go through `expandToOccurrences` once a library is added.
- [ ] Changing one occurrence does not alter its siblings. — BLOCKED: requires recurrence columns and exception tracking.
- [ ] Ending a series retains its past occurrences. — BLOCKED: requires recurrence columns.
- [ ] Expansion is correct across a daylight-saving boundary. — Covered by `calendar-occurrence.service.spec.ts` for the timed-event case; the RRULE expansion path is blocked.

## Todo

- [x] Decide expand-on-read versus materialise — decision: expand-on-read via `expandToOccurrences` in `calendar-occurrence.service.ts`
- [x] If dropping, remove the writes too — write paths in `createEvent`/`updateEvent` never set `isRecurring`/`recurringRule` (schema has no such columns)
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
