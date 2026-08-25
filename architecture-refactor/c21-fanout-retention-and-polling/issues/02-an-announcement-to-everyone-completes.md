# 02 — An announcement to everyone completes

**What to build:** An administrator announces to every member and the request completes. Today a broadcast inserts one row per recipient in sequential batches inside one transaction — holding a connection for minutes past the HTTP timeout — and it bypasses the dispatch pipeline entirely, so a broadcast gets no email, no preference check and no quiet hours.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] A broadcast to a large audience completes within the request budget.
- [ ] It produces one broadcast row rather than one row per recipient — asserted by row count, which is what distinguishes the two strategies.
- [ ] Unread state for a broadcast is the absence of a read receipt.
- [ ] Dismissal is durable and repeat dismissal produces exactly one receipt.
- [ ] Delivery goes through the dispatch pipeline, so preferences and quiet hours are applied and email is sent where asked for.
- [ ] An administrator can see how many people have seen it.
- [ ] Per-user notifications remain fan-out-on-write, which is correct for them.

## Todo

- [ ] Use the audience model that already exists
- [ ] Do not over-apply — the change is for broadcasts only
- [ ] Test with a large audience; three recipients proves nothing
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c21 — Right models, right throughput — fan-out, retention and polling`](../prd.md) · Candidate index: [`../README.md`](../README.md)
