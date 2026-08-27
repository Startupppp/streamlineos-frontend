# 03 — A permission snapshot cannot outlive its grant

**What to build:** A delegation that ends at 14:00 stops working at 14:00. A role that starts at 09:00 starts working at 09:00. Cached authorization ends at the next transition in the underlying grants, not at a fixed number of seconds after it was computed.

**Blocked by:** [01 — The request knows which membership it is](01-the-request-knows-its-membership.md)

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** `modules/access/access.service.ts:90` sets `PERMS_CACHE_TTL_MS = 30_000`, a flat TTL. Explicit revocation is already correct — `accessVersionChannel` plus `CACHE_KEYS.accessVersion(orgId)` bumps a version that invalidates the snapshot, and `SHARED_VERSION_TTL_SECONDS = 300` backs it in Redis. What is missing is the *temporal* half: `user_delegations` carries `startsAt` and `endsAt` (`db/schema/common/auth.ts:464-465`), and nothing caps a snapshot's validity at those instants. A delegation therefore stays effective for up to 30 s past its end, and activates up to 30 s late.

## Acceptance criteria

- [ ] A resolved snapshot carries a `valid_until` that is the earliest of its computed TTL and the nearest upcoming start or end among every grant that fed it.
- [ ] The snapshot key includes the access version, so an explicit revocation still converges within the 5 s the PRD requires; the two mechanisms compose rather than replace each other.
- [ ] A shared cache entry cannot extend authority beyond `valid_until` for any reader — a second membership hitting the same key does not inherit a longer life.
- [ ] A delegation ending mid-second denies on the first request after that instant, proved by a clock-controlled test rather than a sleep.
- [ ] A grant starting in the future is not effective early, which is the failure the flat TTL hides in the other direction.
- [ ] Recomputation cost at the transition is bounded — a thousand delegations expiring at midnight do not stampede; single-flight already exists in `CacheService` and is used.

## Todo

- [ ] Enumerate every input to the snapshot that has a time component before writing the cap — a `valid_until` that misses one source is worse than no cap, because it looks correct.
- [ ] Inject the clock; a temporal test that sleeps is flaky and will be deleted by someone later.
- [ ] Keep `PERMS_CACHE_TTL_MS` as the ceiling, not the rule — it stays as the upper bound when no transition is pending.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
