# 01 — Decide what the transactional outbox is for

**What to build:** A recorded decision, backed by evidence, on whether to wire the domain-event outbox or retire it — and the follow-up tickets that execute whichever answer wins.

There are two durable write paths. One is fully wired end to end and referenced across fifty-odd files. The other is written into by twenty-three modules, has one consumer, and its publisher's flush is a no-op **by design** — so its rows sit pending forever. That was an honest choice: events stay pending rather than being falsely marked delivered, and the delivery function throws rather than silently marking anything delivered if someone flips the flag without implementing routing. It is also, now, twenty-three producers' worth of distance from being a temporary state.

Both answers are defensible. The current state is neither. **This ticket is the decision, not the execution** — a ticket set that pre-commits to both branches would be half fiction.

**Blocked by:** None — can start immediately.

**Status:** evidence gathered 2026-08-25 — decision awaiting sign-off

---

## Evidence (measured 2026-08-25)

⚠️ **Measured against the development database via the owner connection.** Row counts reflect dev usage, not production demand — the DB was wiped and cold-rebuilt on 2026-07-28. Treat the *code* counts as the real signal and the *row* counts as near-meaningless.

**Path B — `outbox_events`**

| Fact | Value |
|---|---|
| Rows | **7**, across 2 organisations |
| Oldest / newest | 2026-08-18 → 2026-08-21 |
| Delivery state | **7 of 7 `PENDING`** — nothing has ever been delivered |
| Event types present in data | 3 (`build.ticket.created`, `build.ticket.status_changed`, `build.project.created`) |
| **Event types emitted in code** | **24** |
| Producer files | 23, across **9 modules**: inventory (5), build (5), invoices (4), finance (2), e-sign (2), accounting (2), surveys (1), support (1), deals (1) |
| `inbox_records` | **0** — the exactly-once fence has never claimed anything |

The 24 emitted types, by namespace: `accounting.*` (7), `inventory.*` (5), `build.*` (5), `sign.*` (3), `support.*` (2), `deal.closed`, `survey.response.submitted`.

**Path A — `notification_outbox`**

| Fact | Value |
|---|---|
| `notification_outbox` rows | 0 |
| `notifications` rows | **465** |

Zero queued and 465 delivered is what a working relay looks like. Path A is genuinely wired end to end.

**The one consumer is unreachable.** `DealClosedConsumerService` is registered as a provider and exported by its module, and **nothing calls it**. It correctly uses the inbox claim fence for exactly-once processing — but the only path that would ever invoke it is the publisher's delivery function, which is never reached because flush short-circuits. It is well-built and dead.

## What the evidence says

**Against retiring:** 24 event types across 9 modules is not a handful and not an accident — it is a deliberate cross-module domain vocabulary somebody designed. The schema carries event dedupe, monotonic per-aggregate versioning, a typed envelope and a consumer-side inbox fence; the one consumer is written correctly against that fence. Retiring means deleting all of it and rewriting 23 producers.

**For retiring:** it has delivered exactly nothing, ever. The fence has claimed nothing. The single consumer has never run. In roughly four months of development, three of the twenty-four types have ever fired even in dev. If the business depended on any of these events, the absence would have surfaced.

**Recommendation: wire the bus** — the constituency is real (9 modules, 24 types), the infrastructure is already better than most teams build before adopting a broker, and the alternative is deleting a deliberate design to replace it with nothing. But this commits real work: a broker, routing in the delivery function, partitioning the event table before it becomes a queue, and eventually making notifications a consumer rather than a peer.

**This needs sign-off before execution.** Both branches are multi-week; picking one is an architecture call with cost implications, not something to infer from row counts in a dev database.

## Acceptance criteria

- [x] The number of rows in the event table, the age of the oldest, and their growth rate are recorded here.
- [x] The count of distinct event types actually emitted across the twenty-three producers is recorded — 24, across 9 modules.
- [x] Whether any producer's caller depends on delivery having happened is answered from the code: **no**. The one consumer is registered but never invoked, so no caller can be depending on delivery.
- [ ] A written decision: wire the bus, or retire the path — with the reasoning and the date. *(Recommendation recorded above; awaiting sign-off.)*
- [ ] The decision is recorded where a future reader will find it.
- [ ] The follow-up tickets for the chosen branch are written into this directory, in dependency order.
- [x] No production code changes in this ticket.

## Todo

- [x] Query the event table: total rows, oldest row, rows per day
- [x] Enumerate the distinct event types the twenty-three producers actually emit
- [x] Check whether the one existing consumer is load-bearing and what breaks without it — it is unreachable; nothing breaks
- [x] Check whether any producer's caller assumes delivery — none can, since delivery has never happened
- [x] Weigh the schema's quality against its use
- [ ] Decide and record, with reasoning and date — **blocked on sign-off**
- [ ] Write the follow-up tickets for the chosen branch
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
