# c22 · Scheduled work runs once, and a deploy sheds no requests

**Status: the designs are sound; three guarantees are missing.** Verified at source 2026-08-25. Crons are HTTP endpoints guarded by a shared secret and triggered by an external scheduler — a good design that avoids in-process timers and makes scheduling operable. Startup is genuinely strict: environment validation runs before the application factory, and the application refuses to serve in production when connected as a bypass-RLS role. Shutdown drains the pool with a five-second timeout. **What is missing: nothing stops a job running twice, nothing stops the load balancer sending traffic into a closing pool, and two write paths that touch money and stock are unverified for concurrency.**

## Problem Statement

**As an operator, a scheduled job can run twice at once.** The secret check validates the caller; it does not prevent concurrent execution. Two scheduler fires, a retry after a timeout, or two instances receiving the same trigger all run the full job in parallel. Depending on the job that means duplicate emails, duplicate notifications, or double-written sweep results.

**As a user, I get the same notification twice.** That is the visible form of the above, and it is the one that reaches customers.

**As a user, every deploy costs me some failed requests.** On termination the pool drains immediately, but the readiness endpoint keeps returning success — so the load balancer keeps routing traffic into a pool that is closing. This is the difference between a clean deploy and a burst of errors on every release.

**As a finance user, invoice numbering may race.** If numbers come from a database sequence it is safe; if they are computed as a maximum plus one without a lock, two concurrent issues can collide. An invoice number is a compliance artifact, so this needs to be known rather than assumed.

**As an inventory user, concurrent stock adjustments may produce impossible quantities.** Transfers correctly lock the row. The adjustment path is unverified — two adjustments that both read a quantity of ten and both post minus ten produce phantom negative stock.

**As an operator, I do not know that any of this happened.** A duplicate run, a shed request or a lost update produces no signal today.

## Solution

Three small, well-understood mechanisms.

**A distributed lease per job.** A Redis set-if-not-exists with an expiry, keyed on the job name, taken before the first tenant iteration. The Redis client and the pattern are already present; this is roughly ten lines and it removes the entire duplicate-execution class.

**A readiness flip before draining.** On the shutdown signal, make the readiness endpoint fail *first*, wait for the load balancer to notice, then drain. Ordering is the whole fix.

**Verify the two unverified write paths**, and lock them the way the already-correct paths are locked. This is a read followed by a small change, not a redesign — the correct pattern is already in the codebase three times over.

## User Stories

1. As an operator, I want a scheduled job to run once even if triggered twice, so that a retry is not a duplicate.
2. As an operator, I want a lease to expire, so that a crashed job does not block the next run forever.
3. As an operator, I want the lease window sized to the job, so that a long job is not pre-empted by the next trigger.
4. As an operator, I want a rejected duplicate trigger to be logged rather than silent, so that a misconfigured scheduler is visible.
5. As an operator, I want a job that fails partway to resume on the next run, so that a failure costs one cycle rather than a manual repair.
6. As a user, I want to receive a notification once, so that a retry does not double-message me.
7. As a user, I want to receive an email once, so that a duplicate run is not a duplicate inbox.
8. As an operator, I want a deploy to shed no requests, so that a release is not a small outage.
9. As an operator, I want readiness to fail before draining begins, so that the load balancer stops routing first.
10. As an operator, I want in-flight requests allowed to finish, so that draining does not cut live work.
11. As an operator, I want a drain timeout, so that a stuck request cannot block a deploy indefinitely.
12. As a finance user, I want invoice numbers to be unique and gapless per the rule we choose, so that the sequence is defensible.
13. As a finance user, I want concurrent invoice issuing to be safe, so that two users cannot take the same number.
14. As an inventory user, I want concurrent stock adjustments to serialize, so that quantity cannot go impossibly negative.
15. As an inventory user, I want stock adjustments and transfers to use the same locking, so that one path is not weaker than the other.
16. As a developer, I want one documented way to make a job exclusive, so that the next scheduled job is safe by default.
17. As a developer, I want to know which write paths are serialized and how, so that a new write path follows an existing pattern.
18. As an operator, I want to know that the database is the only hard single point of failure, so that availability planning is grounded.

## Implementation Decisions

**Already shipped — keep it**

- **Crons as secret-guarded HTTP endpoints** driven by an external scheduler. This avoids in-process timers, survives restarts and is operable. Do not move to in-process scheduling.
- **Per-organisation commits inside the tenant sweep** make a mid-job restart safe: the sweep truncates and the next run resumes, with processed organisations durable. This is well designed and the lease must not break it.
- **Strict startup** — environment validation before the application factory, and a refusal to serve in production as a bypass-RLS role. Migrations are decoupled from boot, so a bad migration is not an outage.
- **Three write paths are already correctly serialized**: ticket sequence numbers via a transaction-scoped advisory lock across nine services, seat quota via a per-organisation advisory lock inside the insert transaction, and stock transfers via row locking. These are the reference patterns.
- **Dependencies other than the database degrade gracefully.** Realtime, cache and email providers are all soft. The database is the only hard single point of failure, and that is an acceptable shape — it just needs to be a known one.

**To build**

- **A job lease**: set-if-not-exists with an expiry, keyed on job name, acquired before the first tenant iteration and released at the end. The expiry is the safety valve — a crashed holder must not block forever.
- **The lease window is per job**, sized above the job's expected duration. A single global window is wrong in both directions.
- **A refused trigger logs and returns a success status.** The scheduler should not treat "already running" as a failure to retry, which would produce a retry storm.
- **The lease wraps the sweep, not each organisation.** Per-organisation commits stay exactly as they are; the lease only prevents two whole runs overlapping.
- **Readiness flips on the pre-shutdown hook**, before the drain starts, with a configurable settling delay for the load balancer to observe it. Then drain with the existing timeout.
- **Liveness and readiness stay distinct.** Readiness fails during shutdown; liveness does not, or the orchestrator kills the process mid-drain.
- **Verify invoice numbering.** If it is a maximum plus one, move it to a database sequence or an advisory lock matching the ticket-number pattern.
- **Verify the stock adjustment path** takes the same row lock the transfer path takes.
- **Each of these emits a signal** per c20 — a refused duplicate, a shed request, a lock timeout.

## Testing Decisions

**What makes a good test here.** All three are concurrency and lifecycle properties, so the tests must actually run things concurrently or in sequence against a real lifecycle. A test that invokes a job once cannot detect a missing lease, and this is precisely the class of defect that unit tests never catch.

- **Concurrent invocation runs the job once.** Fire the endpoint twice simultaneously; assert one execution and one set of side effects. This is the primary test and it must be genuinely concurrent.
- **The lease expires.** Simulate a holder that dies; assert the next trigger proceeds rather than blocking forever.
- **Mid-run restart resumes.** Interrupt after some organisations are processed; assert the next run continues rather than repeating, preserving the existing guarantee.
- **Readiness fails before drain.** On the shutdown signal, assert readiness returns unhealthy *before* the pool begins closing. Ordering is the assertion; both states existing is not enough.
- **In-flight requests complete during drain**, and a request arriving after the readiness flip is not accepted.
- **Concurrent invoice issue produces distinct numbers.** Two concurrent issues, assert no collision.
- **Concurrent stock adjustments cannot drive quantity below zero.** Two adjustments each reading the same starting quantity; assert the final state is arithmetically possible. This is the phantom-stock regression test.
- **The transaction mock must invoke its callback** — a bare stub makes every assertion inside a locked transaction vacuous, which is exactly where these tests live.
- **Prior art**: the existing cron specs, the seat-quota advisory-lock tests, and the stock transfer locking tests, which already demonstrate the concurrent-write test shape.

## Out of Scope

- Moving to a queue or worker system.
- In-process scheduling.
- Multi-region or database failover.
- Read replicas.
- Zero-downtime migration tooling beyond the online-safe rules in c16.
- Frontend offline and reconnect handling, which is a recorded product decision rather than a defect.

## Further Notes

Every item here is a **missing guarantee on a sound design**, which is why the spec is short and none of it is a rewrite. The cron-over-HTTP shape is better than in-process timers; it simply never got the exclusivity that shape needs. Startup validation is stricter than most production applications; shutdown just does its two steps in the wrong order.

The two concurrency items are deliberately framed as *verify then fix*. Three write paths in this codebase are already correctly serialized using two different appropriate mechanisms, so the patterns exist and the question is only whether these two paths adopted them. Reporting them as confirmed defects would have been an overstatement — but they touch money and stock integrity, which is why they are named rather than left to a later pass.
