# 01 — Decide what the transactional outbox is for

**What to build:** A recorded decision, backed by evidence, on whether to wire the domain-event outbox or retire it — and the follow-up tickets that execute whichever answer wins.

There are two durable write paths. One is fully wired end to end and referenced across fifty-odd files. The other is written into by twenty-three modules, has one consumer, and its publisher's flush is a no-op **by design** — so its rows sit pending forever. That was an honest choice: events stay pending rather than being falsely marked delivered, and the delivery function throws rather than silently marking anything delivered if someone flips the flag without implementing routing. It is also, now, twenty-three producers' worth of distance from being a temporary state.

Both answers are defensible. The current state is neither. **This ticket is the decision, not the execution** — a ticket set that pre-commits to both branches would be half fiction.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The number of rows in the event table, the age of the oldest, and their growth rate are recorded here.
- [ ] The count of distinct event types actually emitted across the twenty-three producers is recorded — a handful points one way, dozens the other.
- [ ] Whether any producer's caller depends on delivery having happened is answered from the code, not assumed.
- [ ] A written decision: wire the bus, or retire the path — with the reasoning and the date.
- [ ] The decision is recorded where a future reader will find it, so nobody re-litigates it on next reading the no-op flush.
- [ ] The follow-up tickets for the chosen branch are written into this directory, in dependency order.
- [ ] No production code changes in this ticket.

## Todo

- [ ] Query the event table: total rows, oldest row, rows per day
- [ ] Enumerate the distinct event types the twenty-three producers actually emit
- [ ] Check whether the one existing consumer is load-bearing and what breaks without it
- [ ] Check whether any producer's caller assumes delivery
- [ ] Weigh the schema's quality against its use — event dedupe, a monotonic per-aggregate fence, a typed envelope and a secret-gated flush endpoint are more infrastructure than most teams build before they have a broker, and discarding it has a real cost
- [ ] Decide and record, with reasoning and date
- [ ] Write the follow-up tickets for the chosen branch
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
