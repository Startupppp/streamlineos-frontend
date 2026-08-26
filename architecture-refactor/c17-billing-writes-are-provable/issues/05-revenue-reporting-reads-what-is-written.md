# 05 — Revenue reporting reads what the system writes

**What to build:** Recurring revenue figures reflect reality. Today the event recorder has no call sites, so nothing writes revenue events and the dashboard computes from an empty table. Either the events are written, or the reader is deleted — a dashboard reading a table nothing writes is worse than a missing dashboard.

**Blocked by:** 01 — A provider event is recorded before it is acted on

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Either every billing state change records a revenue event, or the reader and its table are removed.
- [ ] If written, recording happens through the outbox so it cannot be forgotten on a new path.
- [ ] Reported figures reconcile with subscription state.
- [ ] The decision is recorded in the spec.

## Todo

- [ ] Decide write-or-delete before building
- [ ] If writing, enumerate the state changes that must emit
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c17 — Every billing write is provable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
