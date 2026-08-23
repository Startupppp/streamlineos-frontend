# Spec — Adapters that are actually used

Status: **ready-for-agent**
Date: 2026-08-23
Streams: T (payments, ticket T01) · U (chat fan-out, tickets U01–U03)
Testing prerequisite: `2026-08-23-seeded-e2e-harness-prd.md`

Two unrelated parts of the product with the same shape of problem: a well-designed extension point exists, and the code it was built for goes around it.

---

# Part one — payments (stream T)

## Problem Statement

The product can take payment from exactly one provider, and finding that out is expensive.

There is a proper extension point for payment providers: create an order, verify a payment, verify a webhook. One provider implements it. Four parts of the product use it — checking credentials, checking readiness, running a test transaction, checking webhook health. All four are about *configuring* payments.

The part that actually takes money does not use it. It reaches for the one provider directly, and it does so for all three operations that matter. Delete the extension point entirely and the payment code carries on working, which is the clearest possible statement that it is not being used.

For the business this means adding a second provider — a different geography, a different card network, a fallback when the first is down — is not the small piece of work the design implies. It is a rewrite of the payment path, and nobody discovers this until they try.

There is also a testing consequence that costs every day rather than once. Because the payment path is wired to a real provider, it cannot be exercised in a test without real credentials. So the checkout path — the one that must never break — is the least tested thing in billing.

## User Stories

1. As an organisation owner, I want to pay for my subscription reliably, so that my service is not interrupted.
2. As an organisation owner, I want my payment confirmed promptly, so that my plan changes when I pay.
3. As an organisation owner, I want a failed payment to say so clearly, so that I can retry with another method.
4. As an organisation owner, I want to be charged exactly once, so that a retry does not double-bill me.
5. As a finance administrator, I want payment records to match the provider's, so that reconciliation is possible.
6. As a business owner, I want to add a second payment provider without rewriting checkout, so that entering a new market is a small piece of work.
7. As a business owner, I want to fall back to another provider during an outage, so that we can still take money.
8. As a business owner, I want provider fees comparable, so that I can choose commercially.
9. As a developer, I want one interface every payment provider satisfies, so that adding one is a known shape.
10. As a developer, I want the payment path to use that interface, so that the design and the code agree.
11. As a developer, I want no provider-specific data shape crossing the interface, so that the second provider is not forced to imitate the first.
12. As a developer, I want to run the whole checkout path in a test with a stand-in provider, so that checkout is testable at all.
13. As a developer, I want billing tests to run without real credentials, so that anyone can run them.
14. As a developer, I want webhooks routed by provider, so that a second provider's webhook is not misread as the first's.
15. As a developer, I want an unknown provider refused rather than assumed, so that a misconfiguration fails loudly.
16. As a reviewer, I want to see that no behaviour changed, so that a routing change is not a behavioural risk.
17. As a security reviewer, I want signature verification to still reject a forged payment, so that the seam does not weaken verification.
18. As a security reviewer, I want webhook signatures verified before anything is trusted, so that a forged webhook cannot grant a plan.
19. As a security reviewer, I want provider credentials never returned to a client, so that keys stay server-side.
20. As a security reviewer, I want billing to remain undelegatable, so that this work does not open a path to it.
21. As an operator, I want amounts held as whole units of currency, so that no rounding error reaches an invoice.
22. As an operator, I want a provider outage to be visible, so that I know why payments stopped.

## Implementation Decisions

**The existing interface is the contract and it is already the right shape.** Nothing new is designed. What changes is that the payment path starts using it.

**No provider-specific shape crosses the seam.** Whatever the payment path needs from a provider response is named on the interface. If it needs something only one provider could supply, that is the finding — surface it rather than widening the interface to fit one provider, because doing so bakes the first provider into the shape and defeats the change.

**Webhooks are routed by provider.** The route may keep its current address so nothing external needs reconfiguring, but the handler must not assume which provider sent it. An unknown or unconfigured provider is refused, never assumed.

**No behaviour changes.** Same orders, same verification outcomes, same webhook results. This is a routing change, and the tests are what demonstrate that.

**Amounts stay whole units of currency throughout.** No floating-point value touches an amount.

**Billing stays undelegatable.** The rule refusing to grant anything in the billing namespace — including to the organisation owner — is untouched, and billing does not join the delegable module sets.

## Testing Decisions

**A good test here states what was attempted and asserts what came back and what was recorded** — an order, a verification outcome, a plan change. It does not assert which provider method was called.

**The proof this work exists for is a test that cannot be written today:** the whole checkout path driven by a stand-in provider, with no real credentials configured. If that test exists and passes, the seam is real. If it cannot be written, the work is not done.

**Primary seam: the billing controller**, against seeded data, depending on the seeded harness spec. A billing controller e2e spec already exists and is the model for shape.

**Coverage:**

- An order is created through the interface and recorded against the organisation.
- A valid payment verification records the payment and applies the plan.
- An invalid signature is rejected and nothing is recorded.
- A webhook with a valid signature is processed; one with an invalid signature is rejected; one naming an unknown provider is refused rather than assumed.
- Retrying the same payment does not double-apply it.
- Billing tests run to completion with no real credentials present.

**Mutation check:** point the registry at a stand-in that rejects every signature. Every verification test must fail. If they still pass, they were not verifying through the seam.

**Regression net:** the existing provider adapter spec must pass unchanged.

---

# Part two — chat fan-out (stream U)

## Problem Statement

Sending a chat message does seven things in a fixed order, and the code that does them is one long stretch with no way in.

Read the sender. Publish the message. Send push notifications. Read the channel type. Publish a direct-message notification. Load every member of the channel with their names. Notify the mentioned ones.

Nothing can be reordered, batched, or moved onto a queue without editing the function that sends messages. That is why the queue this needs has never been added — there is nowhere to put it.

The mention behaviour is a real defect people can see. Mentions are worked out by matching the text after the `@` against every member's name, in both directions, as substrings. In a company with an Alex and an Alexander, mentioning either notifies both. Typing `@al` notifies everyone whose name contains those letters. The person composing the message already chose a specific colleague from the autocomplete — the product knows exactly who was meant, and then throws that away and guesses from the text.

A third problem sits next door in reading. Opening the channel list quietly rewrites channel names in the database. It is a write during a read, triggered by a piece of code whose description gives no hint that it might happen, so the person maintaining that code cannot know.

**Two things that look like defects are not.** Push notifications are already sent concurrently, not one at a time. And the limit on how many channels a realtime connection covers is logged when it is hit, not silent. Both were re-checked; neither should be changed.

## User Stories

1. As a chat user, I want my message to appear immediately for everyone in the channel, so that conversation feels live.
2. As a chat user, I want to be notified when someone mentions me, so that I do not miss something addressed to me.
3. As a chat user, I want not to be notified when someone mentions a colleague whose name contains mine, so that notifications stay trustworthy.
4. As a chat user named Alex, I want a mention of Alexander to go to Alexander, so that I am not interrupted by other people's conversations.
5. As a chat user, I want the person I picked from the autocomplete to be the person notified, so that the product does what I saw it do.
6. As a chat user, I want a hand-typed name that I did not pick from the list to notify nobody, so that a guess is never made on my behalf.
7. As a chat user, I want mentioning everyone to reach everyone in the channel, so that announcements work.
8. As a chat user, I want to mute a channel and stop being notified by it, so that muting means something.
9. As a chat user, I want a direct message to notify the recipient, so that private conversation is not missed.
10. As a chat user, I want a mention to notify me once, so that I do not get duplicates.
11. As a chat user, I want a person no longer in the channel not to be notified, so that notifications follow membership.
12. As a chat user, I want message sending to stay fast in a large channel, so that a busy company chat is usable.
13. As a chat user, I want my message to send even if notifications fail, so that a delivery problem does not lose my message.
14. As a chat user, I want my message text kept out of push previews, so that it is not shown on a locked phone.
15. As a chat user, I want the sender's name kept out of push previews, so that the same privacy applies.
16. As a chat user, I want the channel list to open quickly, so that switching context is fast.
17. As a chat user, I want a channel named after a record to show that record's current name, so that a renamed record is not stale in chat.
18. As an operator, I want notification delivery failures recorded, so that an outage is visible rather than silent.
19. As an operator, I want message sending to have somewhere to put a queue, so that we can absorb a spike.
20. As a developer, I want one interface that message sending calls, so that everything after the message is stored is behind one thing.
21. As a developer, I want independent work to run concurrently, so that speed is the slowest step rather than the sum.
22. As a developer, I want any ordering that genuinely matters stated on the interface, so that it is not implicit in the order lines appear.
23. As a developer, I want to test message sending without a realtime service or push service, so that the test is fast and reliable.
24. As a developer, I want mention identities sent by the composer, so that the server validates rather than guesses.
25. As a developer, I want the server to reject a mention identity that is not a channel member, so that the client is not trusted.
26. As a developer, I want text-matching for mentions deleted rather than kept as a fallback, so that the old behaviour cannot return through the back door.
27. As a developer, I want reading the channel list to perform no writes, so that reads are reads.
28. As a developer, I want an extension point to declare whether calling it can cause a write, so that I can use it safely.
29. As a developer, I want a slow or broken record lookup to degrade one channel's name and not the list, so that one dependency cannot take out a screen.
30. As a security reviewer, I want a person to be notified only about channels they belong to, so that notification is not an information leak.
31. As a security reviewer, I want work that happens after a request to run with a valid tenant context, so that it does not silently fail.
32. As a security reviewer, I want a failure in that work never swallowed, so that the next outage is not invisible.

## Implementation Decisions

**Message sending calls one thing.** Everything that happens after the message is stored moves behind a single fan-out interface. That interface is where a queue, batching or back-pressure can later be introduced without touching message sending.

**Publishing the message goes first**, because it is what makes the message appear. Push, notifications and mentions do not depend on one another and run concurrently. Any ordering that genuinely matters is stated on the interface rather than implied by the order of lines.

**The per-member notification loop stops awaiting one member at a time.** Push already does this correctly and is the precedent — and push itself must not be changed.

**Work after the request runs with a live tenant context**, either deferred through the existing post-commit mechanism or in its own transaction. It never borrows a transaction that has already committed. A failure in it is never swallowed; that exact mistake once cost this platform every notification in every organisation, invisibly.

**Recipients are resolved while a transaction is live**, never on a handle that has already been released.

**Push previews carry neither the sender's name nor the message text.** This is an existing deliberate decision — a chat message can contain anything and the push service is a third party — and it is preserved and pinned.

**Mentions become explicit.** The composer sends the identities it resolved, the way record references already travel on the same message. The server validates that each is an active member of the channel and ignores the rest; it never trusts the list.

**Text matching is deleted, not kept as a fallback.** A fallback that fires on the same input is the same defect with a longer name.

**Mentioning everyone stays server-side.** It is a fact about a channel, not an identity the composer resolves.

**The client's request shape mirrors the server's exactly.** A contract that drifts silently drops the field, and the feature becomes a no-op that still returns success.

**Renaming on read moves out of the read.** The name is resolved when the channel is created, and existing channels are repaired outside the read path. Falling back to the stored name in a response is fine; writing during a read is not. The extension point that triggers it declares whether calling it can cause a write.

**Two things are explicitly not changed.** Push is already concurrent and is awaited inside the send path rather than fired afterwards, so it never runs on a dead context. The realtime channel limit logs when it is reached. Both were re-verified; an earlier review was wrong about both.

## Testing Decisions

**A good test here states who sent what to which channel and asserts who was notified.** It does not assert how many calls were made to a realtime service.

**Message sending gets a test that needs no infrastructure.** With a stand-in fan-out, sending returns the stored message and dispatches exactly one fan-out, whatever the channel size. That is the payoff of the interface and it is also its proof.

**Mention coverage is where the value is, and one case is the mutation check:**

- A message whose text contains a name but which carries no mention identities notifies nobody. **Restore text matching and this fails.**
- Two members with overlapping names each receive exactly one notification, for their own identity only.
- An identity that is not a channel member is ignored.
- Mentioning everyone still notifies the channel.
- A muted channel does not notify.

**Fan-out coverage:** the message is published for every send; push carries neither sender name nor text; a failing push does not stop notifications; a direct message notifies and a channel message does not use the direct-message path.

**Read-path coverage:** listing channels performs no writes. **This is the mutation check for that ticket.**

**Primary seam: the chat controller**, against seeded data, depending on the seeded harness spec — several chat controller e2e specs already exist and are the model for shape. The stand-in fan-out tests sit at the service seam deliberately, because they are about what sending dispatches rather than what a request returns.

**A trap already paid for here.** A transaction stand-in that does not invoke its callback voids every assertion inside it silently. Any spec touched must be checked for this.

## Out of Scope

- Adding a second payment provider. This makes it cheap; it does not do it.
- The queue, message batching, or partitioning the message store.
- The realtime channel limit, message reactions, invite token storage, or identifier widening — all separately recorded.
- The chat message panel beyond the change needed to send mention identities.
- Changing push, which is already correct.

## Further Notes

These two streams are in one spec because they share a diagnosis, not a domain. In both, someone designed an extension point correctly and the important path did not adopt it. The lesson worth carrying is that an extension point with one adopter and no test that exercises it through the seam is indistinguishable from one that does not work — and both of these were in that state.

The mention defect is the most user-visible thing in this entire set. It is also the cheapest to explain: the product already knows who was meant and chooses to guess instead.
