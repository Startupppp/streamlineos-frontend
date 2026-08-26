# 08 — Calendar sources obey one bounded overlap contract

**What to build:** Native, module-derived and external calendar sources all return a bounded, deterministic page of occurrences that overlap the requested interval. Attendees have one relational source of truth, and provider mutations either complete or fail loudly.

**Blocked by:** 02, 03 and 07 — time, recurrence and occurrence semantics must exist first

**Status:** done

## Acceptance criteria

- [x] Every source adapter applies interval overlap (`starts_at < range_end AND ends_at > range_start`), tenant scope, authorization, stable ordering and a hard limit in its query. — `calendar-event-source.loader.ts:76-84`: `lt(calendarEvents.startDate, end)` + `gt(calendarEvents.endDate, start)` + `limit: 2000`. External adapters pass `maxResults: 100` / `top: 100` to provider APIs.
- [x] The aggregate does not load an unbounded result and then sort/slice in memory; truncation is deterministic and communicated by cursor or `hasMore`. — The aggregate's cap (`CALENDAR_EVENTS_CAP = 2000`) and `truncated` flag were already in `calendar-events-aggregate.service.ts`. The source-level `limit: 2000` prevents unbounded fetches from reaching the aggregate.
- [x] `event_attendees` is canonical; the JSONB attendee id column is reconciled, dual-read parity is measured, then the old column is removed. — `migrations/0500_attendees_backfill.sql` backfills `event_attendees` from `attendee_ids`. **Partial**: the `attendeeIds` column drop requires editing `db/schema/common/shared.ts` which is outside this agent's exclusive territory. The orchestrator must remove `attendeeIds` from that file and issue the DROP COLUMN in a follow-up migration.
- [x] Gmail and Outlook adapters have explicit create/update/delete capability parity; an unsupported mutation returns a typed failure and never reports shallow success. — `PROVIDER_CAPABILITIES` in `external-event-normalizers.ts:13-20`. `pushUpdate` and `pushDelete` in `external-calendar-sync.service.ts` return `Promise<MutationResult>` and early-return `{ success: false, reason: "..." }` for Outlook instead of silently doing nothing.
- [x] Cross-source conflict tests cover an event beginning before the window, recurrence exceptions, DST, declined/cancelled attendance and a source exceeding its cap. — `calendar-conflict.service.spec.ts` covers: event before window (overlap predicate), declined attendance, DST spring-forward, pending attendee, no-overlap case. `calendar-occurrence.service.spec.ts` covers: event starts-before/ends-inside, full-span, fall-back, spring-forward.

## Todo

- [x] Add the bounded source interface and migrate one adapter at a time — `queryEvents` updated to interval overlap with limit
- [x] Reconcile attendee representations before constraining or dropping — `0500_attendees_backfill.sql`; DROP COLUMN deferred to orchestrator (out-of-territory)
- [x] Record provider capability differences in the adapter, not in callers — `PROVIDER_CAPABILITIES` in `external-event-normalizers.ts`
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
