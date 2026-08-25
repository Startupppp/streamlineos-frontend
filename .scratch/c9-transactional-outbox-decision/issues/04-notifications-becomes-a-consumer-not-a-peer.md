# 04 — There is one answer to "how do I emit"

**What to build:** The original finding was two durable write paths with different guarantees and nothing at the call site naming the trade-off. Ticket 01 made the second path deliver, so both now work — but there are still two, and a developer still has to choose. This ticket collapses them: the notification pipeline becomes a **consumer** of the domain-event bus rather than a parallel path beside it.

**This is deliberately last, and it is the largest step.** The notification path is fully wired, has ~51 referencing files and 465 delivered rows, and works. Breaking it to unify would be a bad trade. It should move only once the bus has proven itself in production with real consumers from ticket 02.

**Blocked by:** 02 — Events that matter get a consumer instead of being suppressed.

**Status:** ready-for-agent — hold until the bus has run in production

## Acceptance criteria

- [ ] The notification path's guarantees are written down BEFORE anything moves — routing, preferences, visibility, quiet hours, dedupe windows, rate limits, TTL. Anything the bus cannot express is a blocker, not a detail.
- [ ] A developer has exactly one documented way to emit a domain event, and the call site makes the guarantee obvious.
- [ ] No notification is lost or duplicated during the transition — the inbox fence is the mechanism, and it is proven with a replay test.
- [ ] Notification delivery still honours per-person preferences and quiet hours after the move.
- [ ] The 465-row baseline of successfully delivered notifications is not disturbed.
- [ ] The old path is removed only once nothing writes to it, proved by the module graph rather than a text search.
- [ ] Verified by running the app, not by mocked tests: a real notification is emitted and delivered through the bus.

## Todo

- [ ] Write down the notification path's full guarantee set and check each against the bus
- [ ] Report any guarantee the bus cannot express — that decides whether this ticket proceeds at all
- [ ] Migrate one low-risk event type end to end and verify delivery on a booted app
- [ ] Only then migrate the rest, in batches, keeping both paths alive until the last one moves
- [ ] Remove the old path and prove nothing writes to it
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
