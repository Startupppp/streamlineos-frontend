# c7 · Turn the chat send path into a fan-out module

**Status: implemented on the durable transactional outbox.** Re-audited at source 2026-08-26. The fan-out has an injectable outbox-backed provider seam, deterministic idempotency context for realtime/push/notifications, a tenant-scoped external-effect ledger with lease fencing, transactional retry, replay protection, and no-double-dispatch tests. An external broker is intentionally not selected; provider-enforced exactly-once and live fault-injection evidence remain open.

## Problem Statement

The review's finding was shape, not behaviour: delivery, push, notifications and mention parsing were inlined in one method with no interface, so none of them could be batched, parallelised or queued independently, and send cost tracked channel size. The interface now exists and the work inside it is concurrent. Two costs the seam was meant to make addressable are still paid on every message.

**As a person sending a message to a large channel, my send still costs a fan-out.** `webPush.sendToChannelMembers(orgId, channelId, senderId, ...)` runs in-process, inside the dispatch, and its cost grows with membership. Concurrency with the other two tasks means the *wall clock* no longer sums, but the work is still done synchronously with respect to the request-completing side effect. The seam exists precisely so this becomes a queue push; it has not.

**As a person sending any message, the fan-out re-reads the sender.** `dispatch` opens with a `SELECT name, image FROM users WHERE id = senderId` on every message. The sender is the caller. Their name and image were available in the request that produced the message and are re-fetched per message per channel.

**As an operator, a failed side effect is logged and swallowed.** Each of the three tasks `.catch`es and logs; the outer `dispatch` call also `.catch`es and logs. That is the right shape for not failing a send because a push failed — but there is no durable record and no retry, so a systemic outage of one channel is visible only as log volume. This is the same class of hazard that once produced zero notification rows platform-wide while every request returned 200.

## Solution

Use the seam. `MessageFanout` becomes an interface with two implementations — the current in-process one, and a queue-backed one that enqueues the message and returns. Because `send()` calls `dispatch(input)` and nothing else, that swap is a provider binding, not a rewrite. That was the entire argument for building it.

Then remove the per-message sender read by passing the sender identity into `FanoutInput` — the caller already holds it — and make a persistently failing channel observable rather than merely logged.

## User Stories

1. As a person sending a message to a 500-member channel, I want my send to complete without waiting on a 500-way push fan-out, so that send latency does not track channel size.
2. As a person sending a message, I want no extra database read attributable to my own identity, so that a fact the request already knows is not fetched again.
3. As a person sending a message, I want a failing push provider not to delay my message, so that delivery to others is independent of one channel's health.
4. As a person receiving a message, I want realtime delivery to stay immediate, so that moving push behind a queue does not slow the thing that must be instant.
5. As a person mentioned in a message, I want to be notified only if I was actually mentioned and am actually in the channel, so that an Alex and an Alexander are not both notified.
6. As a person not in a channel, I want a mention of my id by a client to notify me of nothing, so that a hand-crafted request cannot address me in a channel I cannot see.
7. As a person who mentioned `@everyone`, I want every member except me notified, so that the broadcast form still works.
8. As an operator, I want a persistently failing side-effect channel to be visible without reading logs, so that an outage is detected rather than discovered.
9. As an operator, I want a failed fan-out to be retryable, so that a transient provider outage does not permanently lose notifications.
10. As an operator, I want to swap the in-process implementation for a queue-backed one by configuration, so that the change is reversible.
11. As a developer, I want to test the send path against a fake fan-out, so that a message-send test does not require Ably or a push provider.
12. As a developer, I want to test the fan-out in isolation, so that its concurrency and error isolation are covered without sending a message.
13. As a developer adding a fourth side effect, I want to add a task to the fan-out, so that `send()` is untouched.
14. As a security reviewer, I want the realtime publish to carry only what the recipient may see, so that the fan-out is not a disclosure path.

## Implementation Decisions

**Already shipped — recorded so it is not undone**

- **`ChatMessageFanoutService.dispatch(input: FanoutInput)`** is the one seam. `send()` calls it once, inside the deferred post-commit block.
- **Realtime publish runs first, then the rest concurrently.** The ordering is deliberate and documented in `FanoutInput`'s comment: the recipient must see the message immediately; push, DM notification and mention notification are independent and are not ordered relative to each other.
- **Every task has its own `.catch` with structured logging.** One failing side effect does not cancel the others — the `Promise.all` would otherwise reject on the first failure and abandon the rest.
- **Mentions come from the composer and are membership-checked.** `resolveMentionedUserIds` loads the channel's members, drops the sender, and returns `recipients.filter(id => claimed.has(id))` — the client's claim narrows an authoritative list rather than being trusted. `@everyone` returns all recipients. A client-supplied id for a non-member yields nothing.
- **`chat-channels.service.ts` no longer writes during a read.** Entity-channel display names are resolved and returned on a copy of the row.

**Closure recorded**

The implementation binds the provider seam to the durable outbox and
re-dispatches realtime and deferred effects after post-commit failures. Each
external effect is independently recorded in the tenant-scoped
`external_effect_ledger`, keyed by channel, recipient, or push subscription,
with lease ownership, stale-attempt fencing, retry state, and uncertainty
counters. Provider failures propagate to the durable relay. This is
at-least-once delivery: a crash after remote acceptance and before ledger
finalization can still duplicate unless the provider enforces the supplied
idempotency key.

- **`MessageFanout` becomes an interface with two implementations.** `InProcessMessageFanout` is today's service, unchanged. `QueuedMessageFanout` enqueues `FanoutInput` and returns. Selection is configuration. `send()` sees neither.
- **The queued path keeps realtime in-process.** Story 4: publishing to Ably is what makes the message appear, and it must not wait on a queue. Only push and the two notification publishes move. This means the split is *within* dispatch, not at its boundary — the interface takes the whole input either way and decides internally what to defer.
- **`FanoutInput` gains `senderName` and `senderImage`.** The caller resolves them while the request transaction is live and passes them down, and the `SELECT` at the top of `dispatch` is deleted. Note the constraint: deferred work has no tenant GUC, so resolving identity inside the deferred block is exactly the pattern that has failed before — passing it in is both faster and safer.
- **Failures become durable, not just logged.** Each task's `.catch` records a failure the same way the notification path already does, so a systemic outage is queryable. The existing swallow-and-log stays as the outer guarantee that a send never fails on a side effect; what changes is that the swallow leaves a trace.
- **`FanoutInput` stays a value object.** It carries the persisted message, not a transaction handle or a request object — which is what makes the queued implementation possible at all, since the input must survive serialisation.

## Testing Decisions

**What makes a good test here.** Test the fan-out directly with faked collaborators, asserting which recipients were addressed and that one failure does not suppress the others. Test `send()` against a fake fan-out, asserting only that dispatch received the right input. Do not assert call ordering between the three concurrent tasks — that is unspecified by design.

- **Mention resolution** is the highest-value unit and is pure enough to test exhaustively: a claimed id that is a member notifies; a claimed id that is not a member notifies nobody; the sender is never notified; `@everyone` notifies all members but the sender; an empty claim with no `@everyone` returns an empty list without querying. Stories 5–7 map one-to-one onto these cases.
- **Error isolation** — three tasks where the middle rejects: the other two still complete and `dispatch` resolves. This is the property the per-task `.catch` provides and it is invisible without a test, because a regression to a bare `Promise.all` would only fail in production.
- **No sender read** — after passing identity in, assert the fan-out performs no user query. Assert on the fake `db`, not on timing.
- **Queued vs in-process parity** — the same input through both implementations addresses the same recipients. This is the test that makes the swap safe and is the reason the interface exists.
- **`send()` with a fake fan-out** — a message is persisted and dispatch is called once with the persisted message. Prior art for chat controller coverage exists as `*e2e-spec`, which runs only under `pnpm test:e2e`.
- **Traps:** a `db.transaction` mock must invoke its callback. And deferred work must open its own tenant transaction — a spec that passes with a live handle proves nothing about production, where the request transaction has already committed and the GUC is gone.

## Out of Scope

- **Partitioning `chat_messages`.** Already on the carried-forward list.
- **jsonb reactions.** Same list.
- **Choosing a broker.** Related to candidate 9's open question, and that decision belongs there. This candidate makes chat ready to consume whatever is chosen; it does not choose.
- **Realtime channel capability scoping.** A separate access concern.
- **Changing what the composer sends.** Commit `6a141d9ed` already made it send resolved identities; the server's job is to distrust them appropriately, which it does.

## Further Notes

- **The review's "found while reading it" is fixed and fixed well.** `memberName.includes(m) || m.includes(firstName)` is gone. The replacement does not merely take the client's word: it loads the authoritative member list and uses the client's claim only to *narrow* it, so a forged id gains nothing. That is the right trust direction and it is worth not undoing.
- **The review's deletion test was "nothing here is deletable — it is the shape".** That remains true. This is the one candidate where the whole value is optionality: the seam is worth having only if it eventually gets used. If the queue is never wired and the sender read is never removed, the refactor bought nothing but readability.
- **The per-message sender `SELECT` is the cheapest remaining win in the review.** One field added to an input object, one query deleted, on the hottest write path in the product.
- **Outer swallow-and-log is correct but load-bearing.** `.catch()` on the whole dispatch is what stops a push outage from failing sends. Never remove it — but never let it be the only record either. A previous outage in this codebase produced zero notification rows platform-wide while every request returned 200, and it was invisible for exactly this reason.
