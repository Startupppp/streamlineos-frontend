# 08 — Calendar sources obey one bounded overlap contract

**What to build:** Native, module-derived and external calendar sources all return a bounded, deterministic page of occurrences that overlap the requested interval. Attendees have one relational source of truth, and provider mutations either complete or fail loudly.

**Blocked by:** 02, 03 and 07 — time, recurrence and occurrence semantics must exist first

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Every source adapter applies interval overlap (`starts_at < range_end AND ends_at > range_start`), tenant scope, authorization, stable ordering and a hard limit in its query.
- [ ] The aggregate does not load an unbounded result and then sort/slice in memory; truncation is deterministic and communicated by cursor or `hasMore`.
- [ ] `event_attendees` is canonical; the JSONB attendee id column is reconciled, dual-read parity is measured, then the old column is removed.
- [ ] Gmail and Outlook adapters have explicit create/update/delete capability parity; an unsupported mutation returns a typed failure and never reports shallow success.
- [ ] Cross-source conflict tests cover an event beginning before the window, recurrence exceptions, DST, declined/cancelled attendance and a source exceeding its cap.

## Todo

- [ ] Add the bounded source interface and migrate one adapter at a time
- [ ] Reconcile attendee representations before constraining or dropping
- [ ] Record provider capability differences in the adapter, not in callers
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
