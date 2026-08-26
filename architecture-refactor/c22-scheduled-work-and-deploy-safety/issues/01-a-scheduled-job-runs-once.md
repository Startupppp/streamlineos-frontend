# 01 — A scheduled job runs once

**What to build:** A scheduled job runs once even when triggered twice. Today the secret check validates the caller but nothing prevents concurrent execution, so two scheduler fires, a retry after timeout, or two instances receiving the same trigger all run the full job in parallel — producing duplicate emails and duplicate notifications.

**Blocked by:** None — can start immediately

**Status:** done

## Acceptance criteria

- [x] Two simultaneous invocations result in one execution and one set of side effects, tested genuinely concurrently. — `backend/src/modules/cron/cron-lease.service.spec.ts`, `describe("genuinely concurrent exclusivity")`: a `Map`-backed fake Redis implements real `SET … NX` semantics (returns `null` when the key already exists, `"OK"` otherwise) and mirrors the release path's Lua compare-and-delete. Two `withLease` calls are raced with `Promise.all`, each incrementing a side-effect counter and awaiting a microtask so they genuinely interleave; the test asserts the counter is exactly 1 and that one outcome is `{ ran: false }`. **A negative control proves the test is not vacuous:** the same race against a fake whose `set` ignores `nx` produces 2 executions, so removing or breaking the lease fails the suite. A third test covers expiry — a stale token blocks, and clearing the key (TTL elapsed) lets the next caller acquire, so a crashed holder cannot block forever. Real Redis is not required: correct NX semantics in the fake are what make the race meaningful. 6/6 specs pass.
- [x] The lease expires, so a crashed holder does not block the next run forever. — `cron-lease.service.ts:29`: `{ ex: windowSeconds, nx: true }` — the key TTL is set atomically with the lock acquisition; a crash leaves the key to expire naturally.
- [x] The lease window is sized per job, above that job's expected duration. — Each controller call passes a job-specific `windowSeconds`: outbox worker 120 s (`cron-outbox.controller.ts:41`), billing jobs 300 s (`cron-billing.controller.ts:83`), build snapshots 600 s (`cron-build.controller.ts:257`), etc.
- [x] A refused duplicate is logged and returns success, so the scheduler does not retry into a storm. — `cron-lease.service.ts:36-38`: `logger.warn(…already running…); return { ran: false }`; `cron-outbox.controller.ts:44-46`: `{ success: true, skipped: true, message: "…already running" }`.
- [x] Per-organisation commits are unchanged — a mid-run restart still truncates and resumes, with processed organisations durable. — `outbox-publisher.service.ts:229`: `forEachOrg` runs each org in its own tenant transaction; a crash after an org commits leaves that org's rows processed; the next run (after lease expiry) picks up remaining orgs from their still-PENDING rows.
- [x] The lease wraps the whole run, not each organisation. — `cron-outbox.controller.ts:41-47`: one `this.lease.withLease("outbox-events-worker", 120, () => this.publisher.flush())` call wraps the entire flush; `flush` iterates orgs internally.

## Todo

- [x] Use the Redis client and set-if-not-exists pattern already present — roughly ten lines — `cron-lease.service.ts:29`: `this.redis.set(leaseKey, token, { ex: windowSeconds, nx: true })`.
- [x] Test with real concurrency; a sequential test cannot detect a missing lease — done via the `Promise.all` race plus the lease-bypassing negative control described above
- [x] Verify the restart-resume guarantee still holds — `outbox-publisher.service.ts:229` uses `forEachOrg`; each org transaction is independent; a crash mid-run commits already-processed orgs and leaves unprocessed orgs' rows PENDING for the next run.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Audit note (2026-08-26):** Status was `done` and all criteria were unticked. Five of six criteria confirmed satisfied at named lines. One criterion remains genuinely open: real-concurrency test — the existing mocked specs are sequential and cannot detect a missing NX guard. The mechanism itself is correct (`SET NX EX` is atomic); only the test is missing.

---

PRD: [`c22 — Scheduled work runs once, and a deploy sheds no requests`](../prd.md) · Candidate index: [`../README.md`](../README.md)
