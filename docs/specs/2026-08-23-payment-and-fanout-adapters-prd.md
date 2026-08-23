# PRD — Adapters that are actually used

Status: **ready**
Date: 2026-08-23
Streams: T (payments) · U (chat fan-out)
Source: architecture review 2026-08-23, candidates 5 and 7

Two unrelated modules with the same defect: a seam exists, and the path it was built for goes around it.

---

## Part one — the payment provider seam (stream T)

### Problem

`PaymentProviderAdapterRegistry` and `PaymentProviderAdapter` are a clean interface — `createOrder`, `verifyPaymentSignature`, `verifyWebhookSignature` — and `RazorpayAdapter` implements it. Four services use the registry: setup, readiness, test transaction, webhook health. All four are configuration concerns.

`BillingService` — the one that moves money — injects `RazorpayService` directly (`billing.service.ts:25, 57`) and calls it for order creation (`:107`), payment verification (`:129`) and webhook verification (`:272`). Two things are called "adapter" with different contracts: the interface returns `{ providerOrderId, raw }`; the service returns a Razorpay-typed order.

Delete the interface and the registry and `BillingService` compiles unchanged. One adapter means a hypothetical seam; here the seam has zero enforcement on the path it exists for.

### Solution

`BillingService` injects the registry. A second provider becomes one adapter rather than a rewrite of the money path.

### Implementation decisions

**The interface is the contract, and it is already the right one.** No new abstraction; the existing one starts being used.

**The Razorpay-typed return shape stops crossing the seam.** Anything `BillingService` needs from `raw` is named on the interface. If it needs a field no other provider could supply, that is the finding — surface it rather than widening the interface to fit one provider.

**Webhook routing goes through the registry too.** `handleRazorpayWebhook` becomes provider-dispatched. The route may keep its path for compatibility; the handler must not assume the provider.

**No behaviour change.** Same orders, same signatures, same webhook outcomes. This is a routing change and the tests must show it.

### Testing decisions

The property: **an in-memory adapter can drive the whole checkout path.** That is the payoff and it is also the proof — today it is impossible.

Coverage: an order is created through the registry with the configured provider; an invalid signature is rejected; a webhook with an unknown provider is refused rather than assumed; billing tests run with no Razorpay credentials configured.

`razorpay.adapter.spec.ts` is the regression net.

Mutation check: point the registry at an adapter that rejects every signature — the verification tests must fail.

---

## Part two — the chat send fan-out (stream U)

### Problem

`dispatchMessageSideEffects` (`chat-messages.service.ts:261–349`) is a grab-bag: read the sender, publish to Ably, fan out web push to every channel member, read the channel type, publish a DM notification, load **all** channel members with their names, scan them, publish mention notifications. Every step is awaited in order, inside one after-commit tenant transaction.

Cost tracks channel size, and none of it can be batched, parallelised or moved behind a queue without editing `send()`. There is no interface to swap.

Mention resolution is worse than slow. It matches with `memberName.includes(m) || m.includes(firstName)` — bidirectional substring, against every member. `@al` notifies Alex, Alice and Salman. The composer already knew exactly who the sender picked; the server discards that and re-guesses from raw text.

A related read-path defect sits next door: `ensureEntityChannelDisplayName` (`chat-channels.service.ts:59`) issues a DB `UPDATE` inside the channel-list read, driven by an entity adapter whose interface declares no such side effect.

### Solution

One `MessageFanout` interface taking the persisted message. Delivery, push, notifications and mentions become its implementation, free to run concurrently or move behind a queue.

Mention identities travel from the composer as ids and are membership-checked, not re-derived.

### Implementation decisions

**`send()` calls one thing.** `fanout.dispatch(message)`. Everything else is behind it.

**Independent work runs concurrently; ordering that matters is stated.** Realtime publish is what makes the message appear and goes first. Push, notifications and mentions do not depend on each other.

**Per-recipient failure is isolated and logged.** A deferred failure is never swallowed — that rule already exists in this repository and cost it every notification once.

**Mentions become explicit.** The composer sends resolved user ids in message metadata, the way entity references already travel. The server validates each id is a member of the channel and ignores the rest. Raw-text scanning is deleted, not left as a fallback — a fallback that fires on the same input is the same bug.

**`@channel` / `@everyone` / `@here` stay server-side.** They are a channel-level fact, not an identity the composer resolves.

**The entity-channel rename leaves the read path.** Renaming on read is a write in a GET whose trigger is invisible from the adapter interface. It moves to the write that creates the channel, plus a reconciliation the adapter can drive — and the adapter interface says so.

### Testing decisions

The property: **`send()` returns the persisted message and dispatches exactly one fan-out, whatever the channel size.** Asserted with a fake fan-out, so `send()` gets a test that does not need Ably or push.

Fan-out coverage: realtime publish happens for every message; push does not carry sender name or message text (existing rule RT-001, pinned); a failing push does not stop notifications; a DM publishes the DM notification and a channel does not.

Mention coverage: an id that is not a channel member is ignored; two members with overlapping names produce exactly one notification each for their own id; a message with no mention metadata produces none. **The last one is the mutation check** — restore substring matching and it fails.

Read-path coverage: listing channels issues no write.

### Known context, not re-raised

`reactions` as `jsonb`, plaintext invite tokens, `MAX_CAPABILITY_CHANNELS = 500`, unpartitioned `chat_messages` and twelve `serial` primary keys are already on the carried-forward list. The fan-out seam is what makes the queue and the batching possible later; it does not deliver them.

## Out of scope

- Partitioning, primary-key widening, or the realtime capability ceiling.
- `message-panel.tsx` at 1,285 lines, beyond the mention-metadata change.
- Adding a second payment provider. This makes it cheap; it does not do it.
