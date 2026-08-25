# c9 — Decide what the transactional outbox is for

Spec: [`docs/specs/c9-transactional-outbox-decision.md`](../../docs/specs/c9-transactional-outbox-decision.md)

**Candidate complete — 2026-08-25.** All four tickets done and retired.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| — | all four tickets complete and retired | — | **candidate complete** |

The review graded this "worth exploring" rather than "strong", and that grading was right: it was a
question, not a defect. Answering it found a defect anyway, on the path nobody was looking at.

## The answer

**One durable table, one relay, one way to emit.** `dispatch.emit(input)` is now the only way to
emit a notification, and it is durable: with an ambient tenant transaction it records the intent
inside that transaction and drains it the moment the transaction commits, so nothing is lost and
latency is unchanged. `emitDurable` is deleted. The six bus consumers call `emit()` like everyone
else.

**The unification landed on `notification_outbox`, not on the domain bus** — deliberately. Ticket
04's gate found two costs of routing notifications through `outbox_events`: recipients would have to
travel in `payload` by convention, and TTL would need re-implementing. Both are costs of the
*destination*, not of unifying, and both vanish on `notification_outbox`, where `target_user_ids` is
a real column and TTL is already applied downstream. The domain bus keeps carrying domain facts; its
consumers translate them into intents through the same one `emit()`.

## The reading of "one way to emit", stated plainly

Two APIs still exist, and that is deliberate: `OutboxWriter.emit(tx, …)` for a **domain fact**
("the sprint completed"), `dispatch.emit(…)` for a **notification intent** ("tell these people").
What was eliminated is the genuine duplication — two ways to durably emit a *notification*, one of
which silently lost them.

A stricter reading of the ticket wants a single API for both. That was rejected: most notification
call sites already know their recipients, so they would be emitting a "domain event" whose payload
is `{targetUserIds, title, message}`. That is not a domain event; it fakes one to reuse a bus, and
it is how the recipients-in-payload convention would have got in.

**So the honest scorecard is:** one way to emit a domain fact, one way to emit a notification, and
the consumers that bridge them use the same `emit()` as everyone else. If the intent was one API
across both levels, this ticket does not deliver that, and should not be read as having done so.

## What was actually wrong

**`dispatch.emit()` was not durable, and it was the dominant path — 49 call sites across 34 files.**
It ran after commit via `registerAfterCommit` and **swallowed the error into a log**, so a crash
between commit and drain lost the notification silently. Only 3 call sites used the durable
alternative. This was never the candidate's stated finding; it surfaced from auditing the gate.

Two more defects appeared while fixing it, both of which would have been worse than the bug:

- **A stable dedupe key would have destroyed repeat notifications.** The unique index is
  `(org_id, dedupe_key)`, rows are never deleted, and the key carried **no time component** — so the
  second comment on a ticket would hit the index and be swallowed by `onConflictDoNothing`,
  permanently and invisibly. `dedupeKey` is now explicit: consumers pass the producer event id and
  get replay collapsing; everyone else gets a unique row.
- **The drain marked the row on a handle with no tenant GUC.** After-commit hooks run *after*
  `withTenant` returns, so the ALS-routed handle points at the pool. `notification_outbox` is under
  RLS, so the mark was refused `42501`, the row stayed PENDING and the relay re-dispatched — a
  genuine duplicate for any event with no dedupe window. The mark now opens its own tenant
  transaction, and the test was confirmed to fail when the fix is reverted.

## How it was proven

**On a booted app as `streamline_app` with RLS live** — not the owner, which has BYPASSRLS and hides
exactly this class of bug. The probe reproduced `TenantContextInterceptor`'s real shape, including
the gap where hooks run outside the context, then **deliberately discarded the drain hook to
simulate a crash**: the intent survived as PENDING, `relay flush -> {"claimed":1,"processed":1}`
recovered it, and a real notification row appeared. Under the old code that emission left no row at
all. **465 DELIVERED rows unchanged.**

## What code review caught that the work had missed

Two axes were run against the diff. Both landed real hits.

- **The drain swallowed its own failure**, catching and logging at `warn` — the exact thing
  `backend/CLAUDE.md` §4 forbids, and a downgrade from the `error` the old code used. Fixed by not
  catching at all: the intent is committed, so a throw leaves the row PENDING for the relay *and*
  reaches the interceptor's `reportError`. Better observability and less code.
- **A replay could double-deliver.** The relay's comment claimed the unique delivery idempotency key
  made replays safe. False for the **9 events that set `dedupeWindowSeconds: 0`** — mentions, DMs,
  invites, where repeats are legitimate — because the key falls back to a fresh uuid and never
  collides. Routing all traffic through the outbox made this reachable. The row's `dedupeKey` is now
  the idempotency discriminator, proven live on a zero-window event: a replayed row delivered
  nothing the second time.

The review also flagged the missing **relay test** — there was no spec for it at all. There is one
now: crash recovery, dedupe key, retry, dead-lettering. Both new guards were checked by reverting
them and watching the tests fail.

## Earlier findings worth keeping

**The bus was proven live on 2026-08-25.** A real flush returned
`{"claimed":18,"delivered":0,"suppressed":18}` and left the table at 25 SUPPRESSED, **zero PENDING,
zero RETRY, zero DEAD** — every suppressed type one carrying a fire-and-forget verdict.

**Read `claimed:0` carefully.** The first flush returned all zeros against 18 PENDING rows, which
looks exactly like a broken claim query. It is not: `OUTBOX_DISPATCH_ENABLED` is unset by default,
so `flush()` is a deliberate no-op.

**Ticket 02 closed with six consumers on the bus:** `deal.closed`, `survey.response.submitted`,
`inventory.stock.low`, `build.sprint.completed`, `build.release.published`,
`accounting.bill.approved`. Fourteen types stay deliberately fire-and-forget — ten because a
synchronous reaction already covers the same ground, so a consumer would double it.

**The rule for wiring a consumer, refined.** The first rule was "implement only where a notification
catalog entry already specifies the reaction". Wrong test: a missing catalog entry is cheap, since
the nearest sibling's channels and priority can be mirrored. What decides it is **whether the
recipients are derivable from the data**.

**The near-miss worth remembering.** `accounting.bill.approved` looked trivially wireable because
its payload carries `actor_user_id`. That is the **approver**, not the submitter. Wiring it would
have told the person who just clicked approve that their own action succeeded — and read as correct
in review.

**Inventory left scope on 2026-08-25.** Four `inventory.*` types were removed from ticket 02 as work
items. `inventory.stock.low` shipped before the change and stays: removing an analysis item from a
ticket is not a reason to delete live, tested code.

## Still open as a product decision

`accounting.invoice.issued` is the one held event type. "Send the invoice to the customer" is an
outbound business action, not a notification, and no FK settles who sends it.
