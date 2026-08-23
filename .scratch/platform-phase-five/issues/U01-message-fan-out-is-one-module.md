# U01 — Message fan-out is one module

**What to build:** `send()` calls one fan-out interface, and everything it does today moves behind it.

`dispatchMessageSideEffects` (`chat-messages.service.ts:261–349`) is a grab-bag of six awaited steps in sequence: read the sender, publish to Ably, fan out web push to every member, read the channel type, publish a DM notification, load **all** members with their names and scan them for mentions, publish mention notifications. All inside one after-commit tenant transaction.

Nothing can be batched, re-ordered or moved behind a queue without editing `send()`. There is no interface to swap — which is why the queue this needs has never been added.

**Two corrections, both verified at source. Do not "fix" either:**

- **Push is already concurrent.** `WebPushService.sendToChannelMembers` (`realtime/web-push.service.ts:87`) is `Promise.allSettled(members.map(...))`, and it is awaited inside the send path rather than fired after commit, so it never runs on a dead tenant context. An earlier review called this a sequential N+1. It is not.
- **The Ably capability cap is not silent.** It logs org, user, total and granted. A bounded capability list is deliberate.

**What is genuinely sequential** is `chat-notifications.service.ts:49–62`: a `for` loop that awaits `ably.publishToUser` once per member, for DM and mention notifications. That one is real.

**Owns (exclusive):**
- `backend/src/modules/chat/chat-message-fanout.service.ts` (new)
- `backend/src/modules/chat/chat-message-fanout.spec.ts` (new)
- `backend/src/modules/chat/chat-messages.service.ts`
- `backend/src/modules/chat/chat-notifications.service.ts`
- `backend/src/modules/chat/chat.module.ts`

**Blocked by:** nothing
**Wave:** 1
**Status:** DONE

- [x] `send()` calls `fanout.dispatch(message)` and nothing else. Every side effect is behind that one interface.
- [x] Realtime publish runs first — it is what makes the message appear. Push, notifications and mentions do not depend on each other and run concurrently.
- [x] The per-member `for … await ably.publishToUser` loop in `chat-notifications.service.ts:49–62` no longer awaits one member at a time. Push's existing `Promise.allSettled` shape is the precedent; do not change push itself.
- [x] Any ordering that matters is **stated on the interface**, not left implicit in the order of awaits.
- [x] Per-recipient failure is isolated and logged. **A deferred failure is never swallowed** — that rule exists because swallowing one cost this platform every notification, in every org, invisibly.
- [x] The fan-out runs on a live tenant context. It either defers with `registerAfterCommit` or opens its own `runInNewTenantTransaction` — it never borrows a committed request transaction, which dies `42501`.
- [x] Recipient ids are resolved while a transaction is live, never on a dead handle.
- [x] The existing RT-001 rule holds and is pinned: **neither sender name nor message text crosses the push boundary.**
- [x] The property test: **`send()` returns the persisted message and dispatches exactly one fan-out, whatever the channel size** — asserted with a fake fan-out, so `send()` finally has a test that needs neither Ably nor push.
- [x] A test asserts a failing push does not stop notifications.
- [x] A test asserts a DM publishes the DM notification and a channel does not.
- [x] The mention scan moves into the fan-out **unchanged** in this ticket. U02 replaces it. Changing it here and there is how a fallback survives.
- [x] `chat-messages.service.ts` gets smaller, not larger.
- [ ] **Name the `app.module.ts` line you could not write** if the new provider needs wiring. The orchestrator owns that file.
- [x] `tsc --noEmit` exit 0 and the chat specs pass by path.
- [x] A `db.transaction` mock in any spec you touch **invokes its callback** — a bare `jest.fn()` silently voids every assertion inside it.
- [ ] **NOT verified unless stated:** no message was sent through a booted API.

**Not in this ticket:** the queue, batching Ably publishes, partitioning, or the 500-channel capability ceiling. This makes them possible; it does not deliver them.
