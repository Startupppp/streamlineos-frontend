# c15 · Outbound I/O leaves the request transaction

**Status: not started; the mechanism is not where it looks.** Verified at source 2026-08-25. Of 363 explicit `db.transaction` blocks, **two** contain a network call — a genuinely good result that disproves the obvious form of this concern. But `withTenant` wraps **the entire request handler** in `regional.transaction(...)` so the tenant GUC can be set with `SET LOCAL`. Correct for isolation, and it means every outbound call anywhere in a handler holds an open Postgres transaction and a pooled connection for its full duration. Razorpay, R2 and Resend are all called **without a timeout**.

## Problem Statement

**As a user, a slow third party makes the whole product slow.** A hanging upload or payment call does not fail — it waits, holding a database connection out of a small pool. Enough of them and requests unrelated to that provider start queueing for a connection.

**As an operator, an untimed call has no worst case.** There is no deadline on the Razorpay order call, the R2 upload or the Resend send. A provider that accepts a connection and never responds holds a transaction open indefinitely.

**As an operator, a long transaction blocks database housekeeping.** An open transaction holds its snapshot, so autovacuum cannot reclaim rows and locks are held. A slow external call turns into a database problem with no obvious connection to the provider that caused it.

**As a user uploading a file, my upload is inside a transaction.** A payroll batch writes a CSV to blob storage inside the tenant transaction, so upload latency is transaction duration against a small pool.

**As a developer, work after commit has no tenant context.** Post-commit hooks drain *after* `withTenant` returns, so a hook using the injected database handle reaches the pool with no GUC set and dies with a permission error. This has already broken delivery in this codebase.

**As a developer, a streaming response commits early.** A streaming handler returns before the stream ends, so the transaction commits while tools are still running on a context that is live but dead.

## Solution

Two rules, one enforced and one structural.

**Every outbound call has a deadline.** No exceptions and no per-call judgement: a shared HTTP helper that requires a timeout, so an untimed call is not expressible. This is cheap, mechanical, and removes the unbounded case entirely.

**Outbound I/O does not belong inside the request transaction.** Where a call must happen as part of a write, it moves behind the transactional outbox — which is now wired and has six consumers. Where it need not, it moves after the response. The blob upload in the payroll batch path is the clearest instance: the bytes do not need to be in storage before the database commits.

Both rules already have machinery in this codebase. Neither needs new infrastructure.

## User Stories

1. As a user, I want a slow third party to fail fast rather than hang, so that one provider cannot stall the product.
2. As a user, I want an upload that fails to tell me it failed, so that I am not left watching a spinner.
3. As a user, I want my request not to queue behind someone else's slow upload, so that unrelated work stays responsive.
4. As a user making a payment, I want a timeout to leave my account in a known state, so that I am not charged for a request that appeared to fail.
5. As a user, I want an email that fails to send to be retried, so that a transient provider error does not silently drop a notification.
6. As an operator, I want every outbound call to have a deadline, so that no request has an unbounded worst case.
7. As an operator, I want timeouts configurable per provider, so that a slow-by-nature call is not held to an interactive deadline.
8. As an operator, I want a timeout logged with its provider and duration, so that a degrading dependency is visible before it is an incident.
9. As an operator, I want database transactions short, so that autovacuum can keep up and locks are not held.
10. As an operator, I want pool exhaustion to be visible as pool exhaustion, so that I am not debugging it as a query problem.
11. As an operator, I want a failing provider to be retried with backoff, so that a blip recovers without intervention.
12. As a developer, I want one HTTP helper for outbound calls, so that a second untimed one is not written.
13. As a developer, I want the helper to make an untimed call impossible, so that the rule does not depend on review.
14. As a developer, I want post-commit work to carry tenant context, so that a hook does not fail with a permission error.
15. As a developer, I want to know whether to use the outbox or a post-response hook, so that the choice is not made per site.
16. As a security reviewer, I want every outbound URL validated against the existing guard, so that a new call is not a new server-side request forgery surface.
17. As a security reviewer, I want one SSRF guard, so that a second implementation cannot miss a form the first handles.
18. As a security reviewer, I want provider credentials server-side only, so that a client cannot obtain them.
19. As a security reviewer, I want API documentation unreachable in production, so that the surface is not published.
20. As a developer, I want a streaming response to not commit while work is outstanding, so that later writes do not hit a dead context.

## Implementation Decisions

**Already shipped — reuse, do not rebuild**

- **`common/security/ssrf-guard.ts` is the guard.** Use it. A second implementation has already been written here once and it missed the packed IPv6 form the existing one handles. Reaching for a fresh helper is the failure mode.
- **The transactional outbox is wired** — six consumers register through `InboxConsumer`, and the flush endpoint is cron-secret guarded. Deferred outbound work has a home.
- **`registerAfterCommit` and `runInNewTenantTransaction` exist.** The second is what post-commit work needs, because hooks drain after `withTenant` returns and the injected handle has no GUC by then.
- **`withTenant`'s request-wide transaction stays.** It is how `SET LOCAL` reaches the connection, and the Neon pooler drops startup parameters so there is no alternative. This spec shortens what happens inside it; it does not change it.

**To build**

- **A shared outbound HTTP helper with a required deadline.** Timeout is a required argument, not a default that can be omitted — the goal is that an untimed call does not typecheck. It validates the URL through the existing SSRF guard and logs provider, duration and outcome.
- **Razorpay, R2 and Resend move onto it.** These are the three confirmed untimed callers.
- **The R2 client is constructed once**, not per call. It is currently rebuilt on every invocation, which discards connection reuse.
- **Blob upload leaves the tenant transaction.** In the payroll batch path, write the row and enqueue the upload, or upload after the response. The bytes need not land before the commit.
- **Payment provider calls go through the outbox** where they are part of a write. The adapter seam from c5 already exists; this is about when it is called, not how.
- **A stated rule for which mechanism to use.** Outbox when the side effect must happen if and only if the transaction commits. Post-response when it is advisory. Inline with a deadline when the caller genuinely needs the result. Write it down once — this is the decision currently made per site.
- **Streaming handlers do not hold the transaction.** A streaming response returns before its work finishes; the transaction must not be the thing that ends when the handler returns.
- **Swagger is gated in production.** It is served today and it publishes the whole surface.
- **TURN credentials move server-side.** They are currently reachable by the client.
- **Retry with backoff for outbox-delivered calls**, with a dead-letter state after a bounded number of attempts. Idempotency keys where the provider supports them.

## Testing Decisions

**What makes a good test here.** Assert the *deadline* and the *transaction boundary* — both are properties of how a call is made, and both are invisible to a test that only checks the happy path. A mocked provider returning instantly proves nothing about either.

- **A hanging provider is abandoned at the deadline.** Point the helper at a server that accepts and never responds; assert it rejects within the timeout. Without this test the timeout can be wrong and everything still passes.
- **An untimed call is not expressible** — a type-level assertion that the helper cannot be called without a deadline.
- **SSRF rejection** — internal addresses, loopback in every encoding including the packed IPv6 form, link-local, and redirect-to-internal. The existing guard's spec is the prior art; extend it rather than starting a new one.
- **The transaction is not open during the call.** For the payroll batch path, assert the row is committed before the upload is attempted. This is the assertion that proves the reordering happened.
- **Post-commit hooks have tenant context** — a hook performing a write succeeds rather than failing with a permission error. This is a regression test for a live incident.
- **Outbox retry** — a failing delivery is retried with backoff and lands in a dead-letter state after the bound; a subsequent success does not double-apply.
- **Swagger is unreachable in production configuration** — an environment-conditional assertion.
- **Prior art**: the SSRF guard spec, the outbox publisher spec, and the storage service specs.

## Out of Scope

- Replacing any provider.
- A general circuit breaker.
- Moving all outbound calls to the outbox — only those that must be transactional.
- Changing `withTenant`'s request-wide transaction.
- Full observability tooling; this spec adds logging, not tracing.

## Further Notes

The finding worth carrying forward is that **the obvious version of this concern was wrong**. Two of 363 explicit transaction blocks contain network calls — the code looks careful, and it is. The exposure comes from `withTenant`, which wraps every handler, so the audit that would have caught this is not "which transactions contain I/O" but "which requests do", and that is all of them.

This reframes the timeouts from a politeness measure into a pool-exhaustion and long-transaction fix, which is why they sit in the first wave rather than a cleanup pass.
