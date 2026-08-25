# 04 — There is one answer to "how do I emit"

**What to build:** The original finding was two durable write paths with different guarantees and nothing at the call site naming the trade-off. Ticket 01 made the second path deliver, so both now work — but there are still two, and a developer still has to choose. This ticket collapses them: the notification pipeline becomes a **consumer** of the domain-event bus rather than a parallel path beside it.

**This is deliberately last, and it is the largest step.** The notification path is fully wired, has ~51 referencing files and 465 delivered rows, and works. Breaking it to unify would be a bad trade. It should move only once the bus has proven itself in production with real consumers from ticket 02.

**Blocked by:** 02 — Events that matter get a consumer instead of being suppressed.

**Status:** gate answered 2026-08-25 — **the migration may proceed**, and is held only on its timing condition. See "The gate" below.

## Acceptance criteria

- [x] The notification path's guarantees are written down BEFORE anything moves — routing, preferences, visibility, quiet hours, dedupe windows, rate limits, TTL. Anything the bus cannot express is a blocker, not a detail.
- [ ] A developer has exactly one documented way to emit a domain event, and the call site makes the guarantee obvious.
- [ ] No notification is lost or duplicated during the transition — the inbox fence is the mechanism, and it is proven with a replay test.
- [ ] Notification delivery still honours per-person preferences and quiet hours after the move.
- [ ] The 465-row baseline of successfully delivered notifications is not disturbed.
- [ ] The old path is removed only once nothing writes to it, proved by the module graph rather than a text search.
- [ ] Verified by running the app, not by mocked tests: a real notification is emitted and delivered through the bus.

## Todo

- [x] Write down the notification path's full guarantee set and check each against the bus
- [x] Report any guarantee the bus cannot express — that decides whether this ticket proceeds at all
- [ ] Migrate one low-risk event type end to end and verify delivery on a booted app
- [ ] Only then migrate the rest, in batches, keeping both paths alive until the last one moves
- [ ] Remove the old path and prove nothing writes to it
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## The gate, answered (2026-08-25)

**Verdict: nothing the notification path guarantees is architecturally impossible on the bus.** The
migration may proceed. Two items become mandatory requirements on the consumer, and one risk is
larger than the migration itself.

### Why there is no blocker

Every piece of notification machinery — preferences, quiet hours, rate limits, visibility re-checks,
channel fan-out, the circuit breaker, the mandatory-event fallback chain — lives inside
`dispatch()` / `emitNow()`, **not** in whatever triggers them. A bus consumer that assembles a
`DispatchEventInput` and calls `emitNow()` inherits all of it unchanged. The thing being replaced is
only the trigger.

| Guarantee | Where it lives | On the bus |
|---|---|---|
| Preferences, quiet hours, rate limits, channel fan-out, circuit breaker, visibility, read state | inside `dispatch()` | inherited, if the consumer calls `emitNow()` |
| Routing / recipients | `targetUserIds` on the input | **cost** — the bus event has no recipient field; must travel in `payload` |
| TTL / expiry | `expiresAt` on the delivery row, checked before send | **cost** — the bus has no TTL; it retries 8 times regardless of age |
| Priority | catalog `defaultPriority`, drives quiet-hours bypass | cost — carry in `payload` |
| Dedupe | time-bucketed idempotency key per delivery | different granularity from the bus's `(eventId, consumerName)` claim; the two compose |
| Ordering | none guaranteed | none guaranteed — no gap |

The two costs are real work, not detail: the consumer must extract recipients from the payload by
convention, and must check `occurredAt + ttlSeconds` before calling `emitNow()`, or a time-sensitive
event could still create in-app rows minutes after it expired.

### The risk that is bigger than the migration

**`dispatch.emit()` is not durable, and 49 call sites across 34 files use it.** It calls
`registerAfterCommit(() => this.emitNow(input).catch(…))` — the work runs *after* the request
transaction commits, and **the error is swallowed into a log**. A crash between commit and drain
loses the notification silently. Only 3 call sites use the durable `emitDurable`.

So migrating those 34 files to `OutboxWriter.emit(tx, …)` would **change delivery semantics for
almost every notification in the product** — an improvement, since they become durable, but not a
refactor. It also requires every one of those call sites to have an open transaction at emit time,
which has to be checked file by file and cannot be inferred from the call site.

**That finding stands on its own, whatever happens to this ticket:** notification loss on crash is
silent today, on the dominant path.

### Why this is not being migrated now

The ticket's hold is a *timing* condition, not an open question: move only once the bus has proven
itself in production with real consumers. The bus now has three consumers and a verified flush, but
it has **not run in production** — the flag `OUTBOX_DISPATCH_ENABLED` is unset by default and was
enabled only briefly to verify it.

Migrating 34 files onto an unproven bus, while silently upgrading their durability, is exactly the
bad trade this ticket was written to avoid. The gate is answered and the decision recorded; the
execution waits on the condition it always waited on.
