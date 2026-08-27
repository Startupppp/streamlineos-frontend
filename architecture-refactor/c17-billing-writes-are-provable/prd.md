# c17 · Every billing write is provable

**Status: adapter shipped (c5), correctness gaps remain.** Verified at source 2026-08-25. The payment provider adapter exists, `BillingService` no longer calls the provider directly, and an import-boundary spec enforces it. Entitlements resolve server-side from subscriptions; AI billing is token-metered in integer milli-credits with reserve-and-settle. **The architecture is right.** What is missing is proof that individual writes happened: a webhook returns success before its work completes, two coupon guards are inert, a quota check fails open, and the revenue table nothing writes to is the one the dashboard reads.

## Problem Statement

**As a customer, I can be charged and not credited.** The payment webhook fires the AI credit grant without awaiting it, attaches a log-only error handler, and returns success. If the grant fails, the provider is told everything worked, the payment is recorded, and the credits never arrive. There is no retry, because nothing knows it failed.

**As the business, a coupon can be used without limit.** Two guards exist and neither bites: the usage counter is never incremented, and no redemption row is ever inserted. Both read as enforcement. A single-use code is reusable, forever, by anyone.

**As the business, quota enforcement fails open.** When the count query throws, the handler returns zero for all limit keys — so every limit check passes. A database blip during a spike lifts every plan limit at once, which is exactly when it matters.

**As the business, revenue reporting reads an empty table.** The event recorder has no call sites, so nothing writes revenue events. Monthly and annual recurring revenue are computed from a table that is never populated.

**As the business, dunning state is in the wrong place.** The attempts table is dead while the actual state lives in a JSONB array, so collection history cannot be queried, aggregated or audited.

**As an operator, a replayed webhook is not obviously safe.** Providers retry. Without an event ledger keyed on the provider's event id, replay safety depends on each handler being idempotent by construction.

**As a finance user, an invoice can change after issue.** Nothing enforces immutability once issued.

## Solution

Make each billing write prove it happened.

**Webhooks: record, then act, then acknowledge.** Persist the provider event first, keyed on its id so replay is a no-op. Do the work. Acknowledge only after it commits — or hand it to the outbox, which is wired and has consumers, and acknowledge once it is durably enqueued. Never acknowledge a fire-and-forget.

**Make the inert guards bite.** Increment the counter and insert the redemption row, inside the transaction that applies the discount, with a unique constraint doing the real enforcement.

**Fail closed on quota.** A count that cannot be computed is not zero. Refuse the write.

**Write the revenue events**, or delete the reader. A dashboard reading a table nothing writes is worse than a missing dashboard.

**Move dunning state into its table.**

## User Stories

1. As a customer, I want credits I paid for to arrive, so that a successful payment is honoured.
2. As a customer, I want a failed grant retried, so that a transient error does not cost me what I bought.
3. As a customer, I want to be told when a payment succeeded but provisioning did not, so that I am not left guessing.
4. As a customer, I want a duplicate provider notification not to double-credit me, so that a retry is safe.
5. As a customer, I want an issued invoice to be immutable, so that what I was charged cannot change afterwards.
6. As a customer, I want a correction issued as a credit note, so that adjustments are visible rather than silent.
7. As a customer, I want my seat count to reflect who is actually active, so that I am billed for what I use.
8. As a customer, I want a mid-cycle plan change prorated, so that I pay for what I had.
9. As a customer, I want to see what I have consumed against my plan, so that a limit is not a surprise.
10. As a customer, I want AI usage charged on tokens actually used, so that an over-reservation is refunded.
11. As the business, I want a single-use coupon to be usable once, so that a promotion cannot be exploited.
12. As the business, I want coupon redemptions recorded, so that campaign performance is measurable.
13. As the business, I want a coupon's limit enforced under concurrency, so that simultaneous redemptions cannot both succeed.
14. As the business, I want a plan limit to hold when the database is struggling, so that a blip does not lift every limit.
15. As the business, I want revenue events recorded on every billing state change, so that reporting reflects reality.
16. As the business, I want dunning attempts queryable, so that collection performance can be measured.
17. As the business, I want paid-only modules blocked at enablement on a free plan, so that entitlement is enforced at the boundary.
18. As an operator, I want every provider event stored with its id, so that replay is provably safe.
19. As an operator, I want a webhook that cannot complete its work to signal failure, so that the provider retries.
20. As an operator, I want failed provisioning visible in a queue, so that it is worked rather than lost.
21. As an operator, I want reconciliation between provider records and ours, so that divergence is detected.
22. As a security reviewer, I want webhook signatures verified before any work, so that a forged event changes nothing.
23. As a security reviewer, I want entitlement checks server-side, so that a client cannot claim a plan.
24. As a developer, I want entitlement resolution to need no external call per request, so that billing does not sit on the hot path.

## Implementation Decisions

**Already shipped — build on this**

- **The payment provider adapter (c5) is the seam.** `BillingService` no longer calls the provider directly and an import-boundary spec enforces it. New provider work goes through the adapter.
- **Entitlements resolve server-side** from subscriptions, with creation endpoints asserting limits before insert and paid-only modules blocked at enablement. Existing enablement is never revoked on downgrade — a recorded decision, not a defect.
- **AI billing is token-metered.** Integer milli-credits in the ledger, fractional credits in APIs, reserve-and-settle so an under-run refunds and an overage debits. Feature costs are reserve ceilings only, never flat per-action charges.
- **The transactional outbox is wired** with six consumers and a cron-guarded flush. Deferred billing side effects have a home.
- **Billing is exactly two settings pages.** The retired routes stay retired.

**To build**

- **A provider event ledger**, unique on the provider's event id. Insert first; a duplicate short-circuits. This is what makes replay safety structural rather than per-handler.
- **Acknowledge only after durability.** Either the work commits, or it is enqueued on the outbox and that enqueue commits. A fire-and-forget with a logging catch is the current shape and it is the bug.
- **Signature verification before any side effect**, including before the ledger insert.
- **Coupon guards become real.** Increment the counter and insert the redemption in the same transaction as the discount, with a unique constraint on (coupon, redeemer) as the actual enforcement — application-level checking loses under concurrency.
- **Quota fails closed.** Remove the catch that returns zeroed counts. A limit that cannot be evaluated refuses the write and says why.
- **Revenue events: write or delete.** If reporting is required, record on every state change through the outbox so it cannot be forgotten. If not, delete the reader and the table.
- **Dunning state moves into the attempts table.** Migrate the JSONB array, then remove it.
- **Invoice immutability enforced at the database**, not by convention. Corrections are credit notes.
- **Seat counting has one definition**, stated and shared between billing and membership.
- **Outbound provider calls follow c15** — deadline, out of the request transaction.

## Testing Decisions

**What makes a good test here.** Assert final state after a sequence of events, especially adversarial ones — duplicate, out-of-order, failed-midway. Billing bugs are almost never wrong-happy-path; they are wrong-second-time. A test that runs a webhook once proves nothing about the class of defect in this spec.

- **Webhook replay** — the same event twice produces one grant. Then out-of-order arrival, and an event whose work fails: assert the response is a failure so the provider retries, and that no partial state persists.
- **Grant failure is not acknowledged.** Force the credit grant to fail; assert the endpoint does not return success. This is the direct regression test for the live defect.
- **Coupon single-use under concurrency** — two simultaneous redemptions, one succeeds. Application-level assertions pass while the bug is present, so this must exercise the constraint.
- **Quota fails closed** — with the count query throwing, the limited write is refused. The inverse of the current behaviour, and the test that would have caught it.
- **Credit ledger arithmetic** — reserve, settle under, settle over; balances reconcile in integer milli-credits with no rounding drift across a long sequence.
- **Invoice immutability** — mutating an issued invoice is rejected at the database.
- **Entitlement boundary** — a free plan cannot enable a paid-only module; an existing enablement survives a downgrade.
- **The transaction mock must invoke its callback.** A bare stub silently voids every assertion inside a transaction — and every test in this spec runs inside one.
- **Controller e2e** for auth, RBAC, credit exhaustion and cross-tenant isolation. These run only under the e2e command.
- **Prior art**: the existing billing, AI credits and payment webhook specs.

## Out of Scope

- Changing payment provider or adding one.
- Tax calculation and multi-currency beyond what exists.
- Redesigning plan tiers.
- The two-page billing settings structure.
- Token-metering design, which is correct.
- Revenue recognition accounting.

## Further Notes

Every defect here has the same shape: **a mechanism that looks like enforcement and is not.** A coupon guard that never increments. A quota check that returns zero on failure. A webhook that logs an error and returns success. A revenue table with a reader and no writer. Each reads as working code, and each is invisible to types, to a passing test suite and to review.

The common cause is that none of them fails loudly. They fail *permissively* — in the direction of letting the request through — which on a billing path means the failure mode is revenue loss rather than an error someone notices.
